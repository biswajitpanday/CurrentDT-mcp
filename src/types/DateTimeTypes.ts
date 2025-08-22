export interface IDateTimeProvider {
  getCurrentDateTime(): Promise<Date>;
  isAvailable(): Promise<boolean>;
  getName(): string;
  getPriority(): number;
}

export interface IDateTimeService {
  getCurrentDateTime(options?: DateTimeOptions): Promise<string>;
  validateFormat(format: string): boolean;
  getSupportedProviders(): string[];
}

export interface DateTimeOptions {
  format?: string;
  provider?: string;
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, any>;
}

export interface RemoteProviderConfig extends ProviderConfig {
  url: string;
  timeout: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize?: number;
}

export type DateFormat = 'iso' | string;

export const STANDARD_FORMAT_TOKENS = {
  YYYY: '4-digit year',
  MM: '2-digit month',
  DD: '2-digit day',
  HH: '24-hour format hour',
  mm: '2-digit minutes',
  ss: '2-digit seconds',
  SSS: '3-digit milliseconds',
} as const;

export const DEFAULT_FORMATS = {
  iso: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  filename: 'YYYY-MM-DD-HHmmss',
  logdate: 'YYYY/MM/DD HH:mm:ss',
  simple: 'MM/DD/YYYY',
} as const;