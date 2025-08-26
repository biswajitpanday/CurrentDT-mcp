import { DEFAULT_FORMATS, STANDARD_FORMAT_TOKENS } from '../types/DateTimeTypes';
import { DateTimeError } from '../types/MCPTypes';

export class DateFormatter {
  private static readonly ISO_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
  private static readonly FORMAT_REGEX = /YYYY|MM|DD|HH|mm|ss|SSS/g;

  static format(date: Date, format: string = 'iso'): string {
    if (!date || isNaN(date.getTime())) {
      throw new DateTimeError('Invalid date provided for formatting');
    }

    if (format === 'iso') {
      return date.toISOString();
    }

    // Check if it's a predefined format
    const predefinedFormat = DEFAULT_FORMATS[format as keyof typeof DEFAULT_FORMATS];
    if (predefinedFormat) {
      return this.formatWithTokens(date, predefinedFormat);
    }

    // Use custom format
    return this.formatWithTokens(date, format);
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
        default:
          return token;
      }
    });
  }

  static validateFormat(format: string): boolean {
    if (!format || typeof format !== 'string') {
      return false;
    }

    if (format === 'iso') {
      return true;
    }

    // Check if it's a predefined format
    if (format in DEFAULT_FORMATS) {
      return true;
    }

    // Validate custom format tokens
    const tokens = format.match(this.FORMAT_REGEX);
    if (!tokens) {
      // Format string without any tokens is valid (static text)
      return true;
    }

    // Check if all tokens are valid
    return tokens.every(token => token in STANDARD_FORMAT_TOKENS);
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