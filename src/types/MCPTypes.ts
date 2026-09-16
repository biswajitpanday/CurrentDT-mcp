import { z } from 'zod';

// No .default() here on purpose. Defaults applied at this layer are indistinguishable
// from a caller-supplied value, which made `config.defaultFormat` / CURRENTDT_FORMAT
// permanently unreachable. Absent stays absent; DateTimeService resolves the default.
export const DateTimeOptionsSchema = z.object({
  format: z.string().optional(),
  provider: z.string().optional(),
  timezone: z.string().optional(),
}).strict();

export interface MCPError extends Error {
  code: number;
  details?: any;
}

export class DateTimeError extends Error implements MCPError {
  code: number;
  provider?: string;
  format?: string;
  details?: any;

  constructor(message: string, code: number = -1, provider?: string, format?: string, details?: any) {
    super(message);
    this.name = 'DateTimeError';
    this.code = code;
    this.provider = provider;
    this.format = format;
    this.details = details;
  }
}

export class ProviderError extends DateTimeError {
  providerName: string;
  isRetryable: boolean;

  constructor(message: string, providerName: string, isRetryable: boolean = false, details?: any) {
    super(message, -2, providerName, undefined, details);
    this.name = 'ProviderError';
    this.providerName = providerName;
    this.isRetryable = isRetryable;
  }
}

export class ConfigurationError extends Error implements MCPError {
  code: number;
  configPath?: string;
  validationErrors: string[];
  details?: any;

  constructor(message: string, validationErrors: string[] = [], configPath?: string, details?: any) {
    super(message);
    this.name = 'ConfigurationError';
    this.code = -3;
    this.validationErrors = validationErrors;
    this.configPath = configPath;
    this.details = details;
  }
}