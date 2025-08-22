import { LocalProvider } from '../../providers/LocalProvider';

describe('LocalProvider', () => {
  let provider: LocalProvider;

  beforeEach(() => {
    provider = new LocalProvider();
  });

  describe('getCurrentDateTime', () => {
    it('should return current date', async () => {
      const before = Date.now();
      const result = await provider.getCurrentDateTime();
      const after = Date.now();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('should return valid date object', async () => {
      const result = await provider.getCurrentDateTime();
      expect(isNaN(result.getTime())).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should always return true', async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });
  });

  describe('getName', () => {
    it('should return "local"', () => {
      expect(provider.getName()).toBe('local');
    });
  });

  describe('getPriority', () => {
    it('should return priority 1', () => {
      expect(provider.getPriority()).toBe(1);
    });
  });
});