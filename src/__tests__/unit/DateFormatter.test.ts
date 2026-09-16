import { DateFormatter } from '../../utils/DateFormatter';
import { DEFAULT_FORMATS } from '../../types/DateTimeTypes';

describe('DateFormatter', () => {
  const testDate = new Date('2025-08-26T14:30:00.123Z');

  // Token formats render in local time, so expectations are derived from the same
  // Date rather than hardcoded. Hardcoding UTC digits here is what made this suite
  // pass only on a UTC machine.
  const pad = (n: number, width = 2) => n.toString().padStart(width, '0');
  const localDate = `${testDate.getFullYear()}-${pad(testDate.getMonth() + 1)}-${pad(testDate.getDate())}`;
  const localTime = `${pad(testDate.getHours())}:${pad(testDate.getMinutes())}:${pad(testDate.getSeconds())}`;

  describe('format', () => {
    it('should format ISO dates correctly', () => {
      const result = DateFormatter.format(testDate, 'iso');
      expect(result).toBe('2025-08-26T14:30:00.123Z');
    });

    it('should format custom patterns correctly', () => {
      const result = DateFormatter.format(testDate, 'YYYY-MM-DD HH:mm:ss');
      expect(result).toBe(`${localDate} ${localTime}`);
    });

    it('should handle predefined formats', () => {
      const result = DateFormatter.format(testDate, 'filename');
      expect(result).toBe(`${localDate}-${localTime.replace(/:/g, '')}`);
    });

    it('should handle all format tokens', () => {
      const result = DateFormatter.format(testDate, 'YYYY-MM-DD HH:mm:ss.SSS');
      expect(result).toBe(`${localDate} ${localTime}.123`);
    });

    it('should throw error for invalid date', () => {
      const invalidDate = new Date('invalid');
      expect(() => DateFormatter.format(invalidDate, 'iso')).toThrow('Invalid date provided for formatting');
    });

    it('should default to ISO format when format is undefined', () => {
      const result = DateFormatter.format(testDate);
      expect(result).toBe('2025-08-26T14:30:00.123Z');
    });

    it('should reject a format string containing no tokens instead of echoing it', () => {
      // Regression: this used to return the input verbatim, so an LLM passing a
      // natural-language string got that string back as if it were the time.
      expect(() => DateFormatter.format(testDate, 'what time is it')).toThrow(/Invalid format string/);
    });

    it('should not resolve format names through the prototype chain', () => {
      // Regression: DEFAULT_FORMATS['constructor'] used to yield a function, which
      // then blew up inside String.replace as "replace is not a function".
      for (const inherited of ['constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
        expect(() => DateFormatter.format(testDate, inherited)).toThrow(/Invalid format string/);
      }
    });
  });

  describe('offset tokens', () => {
    const offsetMinutes = -testDate.getTimezoneOffset();

    it('should render Z as the real offset, never as a bare literal', () => {
      const result = DateFormatter.format(testDate, 'YYYY-MM-DDTHH:mm:ss.SSSZ');

      if (offsetMinutes === 0) {
        expect(result).toBe('2025-08-26T14:30:00.123Z');
      } else {
        // The digits are local, so the marker must be the true offset -- not 'Z'.
        expect(result).not.toMatch(/Z$/);
        expect(result).toMatch(/[+-]\d{2}:\d{2}$/);
      }

      // Whatever the host timezone, the result must be a valid instant equal to the input.
      expect(new Date(result).getTime()).toBe(testDate.getTime());
    });

    it('should render ZZ in basic form', () => {
      const result = DateFormatter.format(testDate, 'ZZ');
      expect(result).toMatch(/^[+-]\d{4}$/);
    });
  });

  describe('utcOffset', () => {
    it('returns +00:00 for a zero offset unless zeroAsZ is requested', () => {
      const utcOnly = new Date('2025-01-01T00:00:00Z');
      if (utcOnly.getTimezoneOffset() === 0) {
        expect(DateFormatter.utcOffset(utcOnly)).toBe('+00:00');
        expect(DateFormatter.utcOffset(utcOnly, { zeroAsZ: true })).toBe('Z');
      } else {
        expect(DateFormatter.utcOffset(utcOnly)).toMatch(/^[+-]\d{2}:\d{2}$/);
        expect(DateFormatter.utcOffset(utcOnly, { extended: false })).toMatch(/^[+-]\d{4}$/);
      }
    });
  });

  describe('validateFormat', () => {
    it('should validate ISO format', () => {
      expect(DateFormatter.validateFormat('iso')).toBe(true);
    });

    it('should validate predefined formats', () => {
      Object.keys(DEFAULT_FORMATS).forEach(format => {
        expect(DateFormatter.validateFormat(format)).toBe(true);
      });
    });

    it('should validate custom format with valid tokens', () => {
      expect(DateFormatter.validateFormat('YYYY-MM-DD')).toBe(true);
      expect(DateFormatter.validateFormat('HH:mm:ss')).toBe(true);
      expect(DateFormatter.validateFormat('YYYY/MM/DD HH:mm:ss.SSS')).toBe(true);
      expect(DateFormatter.validateFormat('prefix-YYYY-suffix')).toBe(true);
    });

    it('should reject strings that contain no token at all', () => {
      expect(DateFormatter.validateFormat('static text')).toBe(false);
      expect(DateFormatter.validateFormat('what time is it')).toBe(false);
      expect(DateFormatter.validateFormat('INVALID')).toBe(false);
      expect(DateFormatter.validateFormat('constructor')).toBe(false);
    });

    it('should be repeatable (global regex lastIndex must not leak between calls)', () => {
      expect(DateFormatter.validateFormat('YYYY-MM-DD')).toBe(true);
      expect(DateFormatter.validateFormat('YYYY-MM-DD')).toBe(true);
      expect(DateFormatter.validateFormat('YYYY-MM-DD')).toBe(true);
    });

    it('should reject invalid inputs', () => {
      expect(DateFormatter.validateFormat('')).toBe(false);
      expect(DateFormatter.validateFormat(null as any)).toBe(false);
      expect(DateFormatter.validateFormat(undefined as any)).toBe(false);
    });
  });

  describe('getFormatExample', () => {
    it('should return example for valid formats', () => {
      const example = DateFormatter.getFormatExample('YYYY-MM-DD');
      expect(example).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should return "Invalid format" for invalid formats', () => {
      expect(DateFormatter.getFormatExample('invalid')).toBe('Invalid format');
    });
  });

  describe('getSupportedTokens', () => {
    it('should return all supported tokens', () => {
      const tokens = DateFormatter.getSupportedTokens();
      ['YYYY', 'MM', 'DD', 'HH', 'mm', 'ss', 'SSS', 'Z', 'ZZ'].forEach(token => {
        expect(tokens).toHaveProperty(token);
      });
    });
  });
});
