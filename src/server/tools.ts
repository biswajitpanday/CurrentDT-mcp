import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DateTimeService } from '../services/DateTimeService';
import { DEFAULT_FORMATS, STANDARD_FORMAT_TOKENS } from '../types/DateTimeTypes';
import { Logger } from '../utils/Logger';

export const GET_CURRENT_DATETIME = 'get_current_datetime';
export const CONVERT_TIMEZONE = 'convert_timezone';

const TIMEZONE_HINT = 'IANA name such as "UTC", "Europe/Berlin", "America/New_York" or "Asia/Kolkata".';

// No .default() on either field -- see CLAUDE.md rule 2. A default applied here is
// indistinguishable from a caller-supplied value and would mask the configured one.
export const getCurrentDateTimeInput = {
  format: z
    .string()
    .optional()
    .describe(
      `"iso" (default unless configured otherwise) returns UTC, e.g. 2026-08-20T12:31:02.625Z. ` +
        `Anything else is a token pattern rendered in the host's LOCAL time and must contain at ` +
        `least one token; free text is rejected. Tokens: ${Object.keys(STANDARD_FORMAT_TOKENS).join(', ')}. ` +
        `Named patterns: ${Object.keys(DEFAULT_FORMATS).join(', ')}. ` +
        `Examples: "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD-HHmmss", ` +
        `"YYYY-MM-DDTHH:mm:ss.SSSZ" (local time with its real offset).`
    ),
  provider: z
    .enum(['local', 'remote'])
    .optional()
    .describe(
      '"local" (default) reads the system clock. "remote" queries a network time service and ' +
        'fails rather than silently substituting the local clock.'
    ),
  timezone: z
    .string()
    .optional()
    .describe(
      `Zone for \`local\`, \`offset\`, \`timezone\` and any token format. ${TIMEZONE_HINT} ` +
        "Defaults to the host machine's zone. Does not affect `iso`/`utc`, which are always UTC."
    ),
};

export const convertTimezoneInput = {
  time: z
    .string()
    .describe(
      'ISO 8601. With an offset ("2026-03-29T01:30:00+01:00", "...Z") it pins an instant. Without one ' +
        '("2026-03-29T01:30:00") it is a wall-clock reading and `from` is required.'
    ),
  from: z
    .string()
    .optional()
    .describe(`Zone the wall-clock \`time\` was read in. Required when \`time\` has no offset. ${TIMEZONE_HINT}`),
  to: z.string().describe(`Zone to convert into. ${TIMEZONE_HINT}`),
  format: z
    .string()
    .optional()
    .describe('Token pattern for `formatted`, rendered in `to`. Defaults to ISO with offset.'),
};

export const getCurrentDateTimeOutput = {
  formatted: z.string().describe('The requested `format`, rendered. Same value as the text content.'),
  iso: z.string().describe('The instant as ISO 8601 UTC. Use this for machine timestamps.'),
  utc: z.string().describe('UTC clock reading. Identical to `iso` in this version.'),
  local: z.string().describe('Host-local clock reading as ISO 8601 with its real offset, e.g. 2026-08-20T14:31:02.625+02:00.'),
  offset: z.string().describe('Host UTC offset, extended form: "+02:00", "-05:30", "+00:00".'),
  timezone: z.string().describe('IANA zone that `local` and `offset` are stated in, e.g. "Europe/Berlin".'),
  epochMs: z.number().int().describe('Milliseconds since the Unix epoch.'),
  provider: z.string().describe('Which provider actually answered. Differs from the request only on fallback.'),
};

const { provider: _unused, ...describeOutput } = getCurrentDateTimeOutput;
export const convertTimezoneOutput = {
  ...describeOutput,
  from: z.string().describe('Zone the input was interpreted in: `from`, or "offset in input".'),
  dstTransition: z
    .boolean()
    .describe(
      'True when the instant is within an hour of a DST changeover in `to` -- the case where a guessed offset is most likely wrong. Trust `local` and `offset` over any assumption.'
    ),
};

export function registerDateTimeTools(server: McpServer, service: DateTimeService): void {
  const logger = Logger.getInstance();

  server.registerTool(
    GET_CURRENT_DATETIME,
    {
      title: 'Get current date and time',
      description:
        'Get the current date and time. Call this before writing any date, timestamp, year, ' +
        'changelog entry, migration filename or copyright line -- your training data predates ' +
        'today. The text content is the requested `format` only; read `structuredContent` for ' +
        'the same instant stated as UTC (`iso`, `utc`), host-local with offset (`local`, ' +
        '`offset`, `timezone`) and epoch milliseconds, so there is never any doubt which clock ' +
        'a value came from.',
      inputSchema: getCurrentDateTimeInput,
      outputSchema: getCurrentDateTimeOutput,
      annotations: {
        title: 'Get current date and time',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false, // every call returns a later instant
        openWorldHint: false, // the default provider is the local clock; remote is opt-in
      },
    },
    async (args) => {
      logger.debug('Tool call', { tool: GET_CURRENT_DATETIME, args });

      // A thrown error becomes an `isError` tool result -- the spec's channel for tool
      // failures -- rather than a JSON-RPC protocol error. DateTimeError messages are
      // written to be read by the model, so they surface as-is.
      const result = await service.resolve(args);

      return {
        content: [{ type: 'text', text: result.formatted }],
        structuredContent: result,
      };
    }
  );

  server.registerTool(
    CONVERT_TIMEZONE,
    {
      title: 'Convert a time between timezones',
      description:
        'Re-state a time in another timezone, DST-correct for the date in question. Use this ' +
        'instead of adding a remembered offset: offsets change with the calendar, and the hour ' +
        'either side of a changeover is where guesses go wrong. Give `time` with an offset for an ' +
        'exact instant, or without one plus `from` for a wall-clock reading in a named zone.',
      inputSchema: convertTimezoneInput,
      outputSchema: convertTimezoneOutput,
      annotations: {
        title: 'Convert a time between timezones',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true, // pure function of its inputs
        openWorldHint: false,
      },
    },
    async (args) => {
      logger.debug('Tool call', { tool: CONVERT_TIMEZONE, args });
      const result = service.convert(args);
      return {
        content: [{ type: 'text', text: result.formatted }],
        structuredContent: result,
      };
    }
  );
}
