import { DateTimeService } from '../../services/DateTimeService';
import { Configuration } from '../../types/ConfigTypes';
import { DateTimeError, ProviderError } from '../../types/MCPTypes';

describe('DateTimeService', () => {
  let service: DateTimeService;
  let mockConfig: Configuration;

  beforeEach(() => {
    mockConfig = {
      defaultFormat: 'iso',
      defaultProvider: 'local',
      providers: {
        local: {
          name: 'local',
          enabled: true,
          priority: 1,
        }
      },
      customFormats: {},
      debug: false,
      logLevel: 'info' as const,
    };

    service = new DateTimeService(mockConfig);
  });

  describe('getCurrentDateTime', () => {
    it('should return ISO format by default', async () => {
      const result = await service.getCurrentDateTime();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return custom format when specified', async () => {
      const result = await service.getCurrentDateTime({ format: 'YYYY-MM-DD' });
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should use default provider when not specified', async () => {
      const result = await service.getCurrentDateTime();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use specified provider', async () => {
      const result = await service.getCurrentDateTime({ provider: 'local' });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid options', async () => {
      await expect(service.getCurrentDateTime({ format: 'INVALID_TOKEN' }))
        .rejects.toThrow(DateTimeError);
    });

    it('should throw error for unavailable provider', async () => {
      await expect(service.getCurrentDateTime({ provider: 'nonexistent' }))
        .rejects.toThrow(ProviderError);
    });

    it('should handle empty options', async () => {
      const result = await service.getCurrentDateTime({});
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should sanitize malicious input', async () => {
      const maliciousInput = {
        format: 'iso',
        __proto__: { evil: true },
        constructor: 'hack'
      };
      
      const result = await service.getCurrentDateTime(maliciousInput);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('validateFormat', () => {
    it('should validate ISO format', () => {
      expect(service.validateFormat('iso')).toBe(true);
    });

    it('should validate custom formats', () => {
      expect(service.validateFormat('YYYY-MM-DD')).toBe(true);
      expect(service.validateFormat('HH:mm:ss')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(service.validateFormat('INVALID')).toBe(false);
      expect(service.validateFormat('')).toBe(false);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return available providers', () => {
      const providers = service.getSupportedProviders();
      expect(providers).toContain('local');
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats', () => {
      const formats = service.getSupportedFormats();
      expect(formats).toContain('iso');
      expect(Array.isArray(formats)).toBe(true);
    });
  });

  describe('getFormatExample', () => {
    it('should return format examples', () => {
      const example = service.getFormatExample('iso');
      expect(example).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('updateConfiguration', () => {
    it('should update configuration', () => {
      const newConfig: Configuration = {
        ...mockConfig,
        defaultFormat: 'YYYY-MM-DD',
        debug: true
      };

      expect(() => service.updateConfiguration(newConfig)).not.toThrow();
    });
  });
});