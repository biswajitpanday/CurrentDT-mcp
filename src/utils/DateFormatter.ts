import { DEFAULT_FORMATS, STANDARD_FORMAT_TOKENS } from '../types/DateTimeTypes';
import { DateTimeError } from '../types/MCPTypes';
import { hostTimeZone, zonedParts, offsetMinutes, formatOffset } from './TimeZone';

export class DateFormatter {
  // ZZ must precede Z, and SSS must precede ss, so the longer token wins the match.
  private static readonly FORMAT_REGEX = /YYYY|MM|DD|HH|mm|SSS|ss|ZZ|Z/g;

  /**
   * `timeZone` is an IANA name; token patterns render the wall clock in that zone.
   * Omitted, it is the host zone -- the same result the old local-time getters gave,
   * now through the one code path that every zone uses.
   */
  static format(date: Date, format: string = 'iso', timeZone: string = hostTimeZone()): string {
    if (!date || isNaN(date.getTime())) {
      throw new DateTimeError('Invalid date provided for formatting');
    }

    if (format === 'iso') {
      return date.toISOString();
    }

    // Named format, e.g. "filename". Guarded against the prototype chain so that
    // "constructor", "toString" and friends cannot resolve to a function.
    const predefinedFormat = this.getPredefinedFormat(format);
    if (predefinedFormat) {
      return this.formatWithTokens(date, predefinedFormat, timeZone);
    }

    if (!this.validateFormat(format)) {
      throw new DateTimeError(
        `Invalid format string: '${format}'. Expected "iso", a named format (${Object.keys(DEFAULT_FORMATS).join(', ')}), or a pattern containing at least one of: ${Object.keys(STANDARD_FORMAT_TOKENS).join(', ')}`,
        -1,
        undefined,
        format
      );
    }

    return this.formatWithTokens(date, format, timeZone);
  }

  private static getPredefinedFormat(format: string): string | undefined {
    return Object.prototype.hasOwnProperty.call(DEFAULT_FORMATS, format)
      ? DEFAULT_FORMATS[format as keyof typeof DEFAULT_FORMATS]
      : undefined;
  }

  private static formatWithTokens(date: Date, formatString: string, timeZone: string): string {
    const p = zonedParts(date, timeZone);
    return formatString.replace(this.FORMAT_REGEX, (token) => {
      switch (token) {
        case 'YYYY':
          return String(p.year);
        case 'MM':
          return String(p.month).padStart(2, '0');
        case 'DD':
          return String(p.day).padStart(2, '0');
        case 'HH':
          return String(p.hour).padStart(2, '0');
        case 'mm':
          return String(p.minute).padStart(2, '0');
        case 'ss':
          return String(p.second).padStart(2, '0');
        case 'SSS':
          return String(p.millisecond).padStart(3, '0');
        case 'Z':
          // ISO 8601 permits 'Z' for a zero offset, so a UTC zone still emits valid ISO.
          return this.utcOffset(date, { extended: true, zeroAsZ: true }, timeZone);
        case 'ZZ':
          return this.utcOffset(date, { extended: false }, timeZone);
        default:
          return token;
      }
    });
  }

  /**
   * The host's UTC offset for `date`, e.g. "+02:00" (extended) or "+0200" (basic).
   * Token formats render local time, so a literal 'Z' would label local digits as
   * UTC; emitting the true offset is what keeps the output honest. `zeroAsZ` is for
   * the Z token only -- a standalone offset field should read "+00:00", not "Z".
   */
  static utcOffset(
    date: Date,
    opts: { extended?: boolean; zeroAsZ?: boolean } = {},
    timeZone: string = hostTimeZone()
  ): string {
    return formatOffset(offsetMinutes(date, timeZone), opts);
  }

  static validateFormat(format: string): boolean {
    if (!format || typeof format !== 'string') {
      return false;
    }

    if (format === 'iso') {
      return true;
    }

    if (Object.prototype.hasOwnProperty.call(DEFAULT_FORMATS, format)) {
      return true;
    }

    // A pattern must actually contain a date/time token. Without this check any
    // string is "valid" and gets echoed back to the caller as if it were a datetime.
    return this.FORMAT_REGEX.test(this.reset(format));
  }

  /** `FORMAT_REGEX` is global, so lastIndex must be cleared between `test` calls. */
  private static reset(format: string): string {
    this.FORMAT_REGEX.lastIndex = 0;
    return format;
  }

  static getSupportedTokens(): typeof STANDARD_FORMAT_TOKENS {
    return STANDARD_FORMAT_TOKENS;
  }

  static getPredefinedFormats(): typeof DEFAULT_FORMATS {
    return DEFAULT_FORMATS;
  }

  static getFormatExample(format: string): string {
    const exampleDate = new Date('2025-08-26T14:30:00.123Z');
    try {
      return this.format(exampleDate, format);
    } catch {
      return 'Invalid format';
    }
  }
}
