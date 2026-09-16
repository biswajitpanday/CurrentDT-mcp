export interface IDateTimeService {
  getCurrentDateTime(options?: DateTimeOptions): Promise<string>;
  validateFormat(format: string): boolean;
  getSupportedProviders(): string[];
}

export interface DateTimeOptions {
  format?: string;
  provider?: string;
}

/**
 * One instant, stated from every clock a caller might mean. Returned as the tool's
 * structuredContent so no consumer has to infer whether a string was UTC or local --
 * the ambiguity that produced v1's wrong timestamps.
 */
// A type alias, not an interface, on purpose: the SDK types structuredContent as
// `{ [x: string]: unknown }`, and only aliases get TypeScript's implicit index signature.
export type DateTimeResult = {
  /** The caller's requested `format`, rendered exactly as v1 returned it. */
  formatted: string;
  /** The instant as an ISO 8601 UTC string. Canonical machine value. */
  iso: string;
  /** The UTC clock reading. Identical to `iso` until a timezone parameter exists. */
  utc: string;
  /** The host-local clock reading as ISO 8601 with its real offset, e.g. ...+02:00. */
  local: string;
  /** Host UTC offset in extended form: "+02:00", "-05:30", "+00:00". */
  offset: string;
  /** IANA zone the `local` and `offset` fields are stated in, e.g. "Europe/Berlin". */
  timezone: string;
  /** Milliseconds since the Unix epoch. */
  epochMs: number;
  /** Which provider actually answered -- may differ from the one requested on fallback. */
  provider: string;
};

export const STANDARD_FORMAT_TOKENS = {
  YYYY: '4-digit year',
  MM: '2-digit month',
  DD: '2-digit day',
  HH: '24-hour format hour',
  mm: '2-digit minutes',
  ss: '2-digit seconds',
  SSS: '3-digit milliseconds',
  Z: 'UTC offset, extended (+02:00, or Z when the offset is zero)',
  ZZ: 'UTC offset, basic (+0200)',
} as const;

// Token patterns render in LOCAL time. A named format must therefore never embed a
// literal 'Z' -- use the Z token, which emits the real offset.
export const DEFAULT_FORMATS = {
  filename: 'YYYY-MM-DD-HHmmss',
  logdate: 'YYYY/MM/DD HH:mm:ss',
  simple: 'MM/DD/YYYY',
} as const;
