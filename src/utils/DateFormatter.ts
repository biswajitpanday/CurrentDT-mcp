import { DEFAULT_FORMATS, STANDARD_FORMAT_TOKENS } from '../types/DateTimeTypes';
import { DateTimeError } from '../types/MCPTypes';

export class DateFormatter {
  // ZZ must precede Z, and SSS must precede ss, so the longer token wins the match.
  private static readonly FORMAT_REGEX = /YYYY|MM|DD|HH|mm|SSS|ss|ZZ|Z/g;

  static format(date: Date, format: string = 'iso'): string {
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
      return this.formatWithTokens(date, predefinedFormat);
    }

    if (!this.validateFormat(format)) {
      throw new DateTimeError(
        `Invalid format string: '${format}'. Expected "iso", a named format (${Object.keys(DEFAULT_FORMATS).join(', ')}), or a pattern containing at least one of: ${Object.keys(STANDARD_FORMAT_TOKENS).join(', ')}`,
        -1,
        undefined,
        format
      );
    }

    return this.formatWithTokens(date, format);
  }

  private static getPredefinedFormat(format: string): string | undefined {
    return Object.prototype.hasOwnProperty.call(DEFAULT_FORMATS, format)
      ? DEFAULT_FORMATS[format as keyof typeof DEFAULT_FORMATS]
      : undefined;
  }

  private static formatWithTokens(date: Date, formatString: string): string {
    return formatString.replace(this.FORMAT_REGEX, (token) => {
      switch (token) {
        case 'YYYY':
          return date.getFullYear().toString();
        case 'MM':
          return (date.getMonth() + 1).toString().padStart(2, '0');
        case 'DD':
          return date.getDate().toString().padStart(2, '0');
        case 'HH':
          return date.getHours().toString().padStart(2, '0');
        case 'mm':
          return date.getMinutes().toString().padStart(2, '0');
        case 'ss':
          return date.getSeconds().toString().padStart(2, '0');
        case 'SSS':
          return date.getMilliseconds().toString().padStart(3, '0');
        case 'Z':
          return this.getOffset(date, true);
        case 'ZZ':
          return this.getOffset(date, false);
        default:
          return token;
      }
    });
  }

  /**
   * Renders the real UTC offset of the local time the other tokens are rendered in.
   * Token formats use local-time getters, so a literal 'Z' would label local digits
   * as UTC. Emitting the true offset keeps the output honest.
   */
  private static getOffset(date: Date, extended: boolean): string {
    const totalMinutes = -date.getTimezoneOffset();

    if (totalMinutes === 0) {
      // ISO 8601 permits 'Z' for a zero offset, so a UTC host still emits valid ISO.
      return extended ? 'Z' : '+0000';
    }

    const sign = totalMinutes < 0 ? '-' : '+';
    const abs = Math.abs(totalMinutes);
    const hours = Math.floor(abs / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (abs % 60).toString().padStart(2, '0');

    return extended ? `${sign}${hours}:${minutes}` : `${sign}${hours}${minutes}`;
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
