import { DateTimeError } from '../types/MCPTypes';

/** Wall-clock fields of one instant as read in one IANA zone. */
export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
  millisecond: number;
}

// One formatter per zone. Constructing Intl.DateTimeFormat is the expensive part;
// formatting with it is cheap.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    // hourCycle h23 matters: hour12:false alone yields "24" at midnight on some ICU builds.
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function hostTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function isValidTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== 'string' || timeZone.length === 0) return false;
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Throws a DateTimeError the model can act on rather than a bare RangeError. */
export function assertTimeZone(timeZone: string): void {
  if (!isValidTimeZone(timeZone)) {
    throw new DateTimeError(
      `Unknown timezone '${timeZone}'. Use an IANA name such as "UTC", "Europe/Berlin" or "Asia/Tokyo".`,
      -1
    );
  }
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
    // Milliseconds are zone-independent; Intl does not expose them anyway.
    millisecond: date.getMilliseconds(),
  };
}

/**
 * The zone's UTC offset at `date`, in minutes east of UTC. Derived by reading the
 * wall clock in the zone and diffing against the instant, which needs no offset
 * formatting support from ICU and is exact to the second.
 */
export function offsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

export function formatOffset(
  minutes: number,
  opts: { extended?: boolean; zeroAsZ?: boolean } = {}
): string {
  const { extended = true, zeroAsZ = false } = opts;
  if (minutes === 0 && zeroAsZ) return 'Z';
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return extended ? `${sign}${hh}:${mm}` : `${sign}${hh}${mm}`;
}

/**
 * The instant at which a wall-clock reading occurs in a zone. Needed when a caller
 * gives a time with no offset and names the zone it was read in.
 *
 * Two passes: guess the instant assuming UTC, read the zone's offset there, correct,
 * then re-read the offset at the corrected instant in case the guess straddled a DST
 * change. Wall-clock times that never exist (the spring-forward gap) resolve to the
 * instant after the gap; ambiguous ones (the autumn repeat) resolve to the first.
 */
export function wallClockToInstant(p: ZonedParts, timeZone: string): Date {
  const guess = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond);
  let instant = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  instant = guess - offsetMinutes(new Date(instant), timeZone) * 60_000;
  return new Date(instant);
}

/**
 * True when the zone's offset one hour before or after `date` differs from its
 * offset at `date` -- i.e. the instant sits within an hour of a DST changeover,
 * where an LLM guessing the offset is most likely to be wrong.
 */
export function isNearDstTransition(date: Date, timeZone: string): boolean {
  const here = offsetMinutes(date, timeZone);
  const hour = 60 * 60_000;
  return (
    offsetMinutes(new Date(date.getTime() - hour), timeZone) !== here ||
    offsetMinutes(new Date(date.getTime() + hour), timeZone) !== here
  );
}

/**
 * Parses an ISO 8601 string. Returns the instant and whether the string carried its
 * own offset -- without one, the caller must say which zone the wall clock was in.
 */
export function parseIso(input: string): { date: Date; hasOffset: boolean } {
  const trimmed = input.trim();
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    throw new DateTimeError(
      `Cannot parse '${input}' as ISO 8601. Expected e.g. "2026-03-29T01:30:00" or "2026-03-29T01:30:00+01:00".`,
      -1
    );
  }
  return { date, hasOffset };
}

/** Wall-clock fields of an offset-less ISO string, read literally. */
export function isoWallClock(input: string): ZonedParts {
  const m = input
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/);
  if (!m) {
    throw new DateTimeError(
      `Cannot read '${input}' as a wall-clock time. Expected "YYYY-MM-DDTHH:mm[:ss[.SSS]]".`,
      -1
    );
  }
  return {
    year: +m[1],
    month: +m[2],
    day: +m[3],
    hour: +(m[4] ?? 0),
    minute: +(m[5] ?? 0),
    second: +(m[6] ?? 0),
    millisecond: +(m[7] ?? '0').padEnd(3, '0'),
  };
}
