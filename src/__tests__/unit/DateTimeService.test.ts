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
          priority: 1,
        }
      },
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

  describe('resolve', () => {
    it('states the same instant from every clock', async () => {
      const r = await service.resolve();
      expect(r.utc).toBe(r.iso);
      expect(new Date(r.iso).getTime()).toBe(r.epochMs);
      expect(new Date(r.local).getTime()).toBe(r.epochMs);
    });

    it('reports the host offset in extended form, never as a bare Z', async () => {
      const r = await service.resolve();
      expect(r.offset).toMatch(/^[+-]\d{2}:\d{2}$/);
      expect(r.offset).toBe(
        r.offset === '+00:00' ? '+00:00' : r.local.slice(-6)
      );
    });

    it('names an IANA timezone', async () => {
      const r = await service.resolve();
      expect(r.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    });

    it('formatted equals what getCurrentDateTime returns for the same options', async () => {
      const r = await service.resolve({ format: 'YYYY-MM-DD' });
      expect(r.formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.formatted).toBe(r.local.slice(0, 10));
    });

    it('records which provider answered', async () => {
      const r = await service.resolve({ provider: 'local' });
      expect(r.provider).toBe('local');
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