import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DateTimeService } from '../services/DateTimeService';
import { DEFAULT_FORMATS, STANDARD_FORMAT_TOKENS } from '../types/DateTimeTypes';
import { Logger } from '../utils/Logger';

export const GET_CURRENT_DATETIME = 'get_current_datetime';

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
}
