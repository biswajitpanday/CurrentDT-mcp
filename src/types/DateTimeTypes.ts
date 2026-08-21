export interface IDateTimeService {
  getCurrentDateTime(options?: DateTimeOptions): Promise<string>;
  validateFormat(format: string): boolean;
  getSupportedProviders(): string[];
}

export interface DateTimeOptions {
  format?: string;
  provider?: string;
}

export const STANDARD_FORMAT_TOKENS = {
  YYYY: '4-digit year',
  MM: '2-digit month',
  DD: '2-digit day',
  HH: '24-hour format hour',
  mm: '2-digit minutes',
  ss: '2-digit seconds',
  SSS: '3-digit milliseconds',
  Z: 'UTC offset, extended (+02:00, or Z when the offset is zero)',
  ZZ: 'UTC offset, basic (+0200)',
} as const;

// Token patterns render in LOCAL time. A named format must therefore never embed a
// literal 'Z' -- use the Z token, which emits the real offset.
export const DEFAULT_FORMATS = {
  filename: 'YYYY-MM-DD-HHmmss',
  logdate: 'YYYY/MM/DD HH:mm:ss',
  simple: 'MM/DD/YYYY',
} as const;
