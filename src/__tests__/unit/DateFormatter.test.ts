import { DateFormatter } from '../../utils/DateFormatter';
import { DEFAULT_FORMATS } from '../../types/DateTimeTypes';

describe('DateFormatter', () => {
  const testDate = new Date('2025-08-26T14:30:00.123Z');

  describe('format', () => {
    it('should format ISO dates correctly', () => {
      const result = DateFormatter.format(testDate, 'iso');
      expect(result).toBe('2025-08-26T14:30:00.123Z');
    });

    it('should format custom patterns correctly', () => {
      const result = DateFormatter.format(testDate, 'YYYY-MM-DD HH:mm:ss');
      expect(result).toBe('2025-08-26 14:30:00');
    });

    it('should handle predefined formats', () => {
      const result = DateFormatter.format(testDate, 'filename');
      expect(result).toBe('2025-08-26-143000');
    });

    it('should handle all format tokens', () => {
      const format = 'YYYY-MM-DD HH:mm:ss.SSS';
      const result = DateFormatter.format(testDate, format);
      expect(result).toBe('2025-08-26 14:30:00.123');
    });

    it('should throw error for invalid date', () => {
      const invalidDate = new Date('invalid');
      expect(() => DateFormatter.format(invalidDate, 'iso')).toThrow('Invalid date provided for formatting');
    });

    it('should default to ISO format when format is undefined', () => {
      const result = DateFormatter.format(testDate);
      expect(result).toBe('2025-08-26T14:30:00.123Z');
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
    });

    it('should validate static text formats', () => {
      expect(DateFormatter.validateFormat('static text')).toBe(true);
      expect(DateFormatter.validateFormat('prefix-YYYY-suffix')).toBe(true);
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
      const example = DateFormatter.getFormatExample('invalid');
      expect(example).toBe('Invalid format');
    });
  });

  describe('getSupportedTokens', () => {
    it('should return all supported tokens', () => {
      const tokens = DateFormatter.getSupportedTokens();
      expect(tokens).toHaveProperty('YYYY');
      expect(tokens).toHaveProperty('MM');
      expect(tokens).toHaveProperty('DD');
      expect(tokens).toHaveProperty('HH');
      expect(tokens).toHaveProperty('mm');
      expect(tokens).toHaveProperty('ss');
      expect(tokens).toHaveProperty('SSS');
    });
  });
});