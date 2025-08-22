import { z } from 'zod';

export const DateTimeOptionsSchema = z.object({
  format: z.string().optional().default('iso'),
  provider: z.string().optional().default('local'),
}).strict();

export type DateTimeOptions = z.infer<typeof DateTimeOptionsSchema>;

export interface MCPToolRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

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