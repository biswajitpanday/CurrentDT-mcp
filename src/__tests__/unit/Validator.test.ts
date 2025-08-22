import { Validator } from '../../utils/Validator';
import { DateTimeOptions } from '../../types/DateTimeTypes';

describe('Validator', () => {
  describe('validateDateTimeOptions', () => {
    it('should validate valid options', () => {
      const options: DateTimeOptions = {
        format: 'iso',
        provider: 'local'
      };
      
      const result = Validator.validateDateTimeOptions(options);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(options);
    });

    it('should apply defaults for missing options', () => {
      const result = Validator.validateDateTimeOptions({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        format: 'iso',
        provider: 'local'
      });
    });

    it('should validate custom formats', () => {
      const options = {
        format: 'YYYY-MM-DD',
        provider: 'local'
      };
      
      const result = Validator.validateDateTimeOptions(options);
      expect(result.success).toBe(true);
    });

    it('should reject invalid format strings', () => {
      const options = {
        format: 'INVALID_TOKEN',
        provider: 'local'
      };
      
      const result = Validator.validateDateTimeOptions(options);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid format string: INVALID_TOKEN');
    });

    it('should handle null and undefined inputs', () => {
      expect(Validator.validateDateTimeOptions(null).success).toBe(true);
      expect(Validator.validateDateTimeOptions(undefined).success).toBe(true);
    });
  });

  describe('validateProvider', () => {
    const availableProviders = ['local', 'remote'];

    it('should validate available providers', () => {
      expect(Validator.validateProvider('local', availableProviders)).toBe(true);
      expect(Validator.validateProvider('remote', availableProviders)).toBe(true);
    });

    it('should reject unavailable providers', () => {
      expect(Validator.validateProvider('unknown', availableProviders)).toBe(false);
    });
  });

  describe('validateFormat', () => {
    it('should validate ISO format', () => {
      expect(Validator.validateFormat('iso')).toBe(true);
    });

    it('should validate custom formats', () => {
      expect(Validator.validateFormat('YYYY-MM-DD')).toBe(true);
      expect(Validator.validateFormat('HH:mm:ss')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(Validator.validateFormat('')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should return clean object for valid input', () => {
      const input = { format: 'iso', provider: 'local' };
      const result = Validator.sanitizeInput(input);
      expect(result).toEqual(input);
    });

    it('should remove dangerous properties', () => {
      const input = {
        format: 'iso',
        __proto__: { malicious: true },
        constructor: 'hack',
        prototype: 'exploit'
      };
      
      const result = Validator.sanitizeInput(input);
      expect(result).toEqual({ format: 'iso' });
      expect(result).not.toHaveProperty('__proto__');
      expect(result).not.toHaveProperty('constructor');
      expect(result).not.toHaveProperty('prototype');
    });

    it('should handle null and undefined', () => {
      expect(Validator.sanitizeInput(null)).toEqual({});
      expect(Validator.sanitizeInput(undefined)).toEqual({});
    });

    it('should handle non-object inputs', () => {
      expect(Validator.sanitizeInput('string')).toEqual({});
      expect(Validator.sanitizeInput(123)).toEqual({});
      expect(Validator.sanitizeInput(true)).toEqual({});
    });
  });

  describe('isValidDate', () => {
    it('should validate valid dates', () => {
      expect(Validator.isValidDate(new Date())).toBe(true);
      expect(Validator.isValidDate(new Date('2025-08-22'))).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(Validator.isValidDate(new Date('invalid'))).toBe(false);
      expect(Validator.isValidDate('not a date' as any)).toBe(false);
      expect(Validator.isValidDate(null as any)).toBe(false);
    });
  });

  describe('isValidDateString', () => {
    it('should validate valid date strings', () => {
      expect(Validator.isValidDateString('2025-08-22')).toBe(true);
      expect(Validator.isValidDateString('2025-08-22T14:30:00Z')).toBe(true);
    });

    it('should reject invalid date strings', () => {
      expect(Validator.isValidDateString('invalid-date')).toBe(false);
      expect(Validator.isValidDateString('')).toBe(false);
      expect(Validator.isValidDateString('   ')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(Validator.isValidDateString(123 as any)).toBe(false);
      expect(Validator.isValidDateString(null as any)).toBe(false);
    });
  });
});