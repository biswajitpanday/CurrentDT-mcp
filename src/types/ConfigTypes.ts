import { z } from 'zod';
import { ProviderConfig, CacheConfig } from './DateTimeTypes';

export const ProviderConfigSchema = z.object({
  name: z.string(),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).default(1),
  config: z.record(z.any()).optional(),
});

export const RemoteProviderConfigSchema = ProviderConfigSchema.extend({
  url: z.string().url(),
  timeout: z.number().int().min(1000).max(30000).default(5000),
});

export const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ttl: z.number().int().min(100).max(60000).default(1000),
  maxSize: z.number().int().min(10).max(10000).optional().default(100),
});

export const ConfigurationSchema = z.object({
  defaultFormat: z.string().default('iso'),
  defaultProvider: z.string().default('local'),
  providers: z.record(ProviderConfigSchema).default({
    local: {
      name: 'local',
      enabled: true,
      priority: 1,
    },
  }),
  customFormats: z.record(z.string()).optional().default({}),
  cache: CacheConfigSchema.optional(),
  debug: z.boolean().default(false),
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Configuration = z.infer<typeof ConfigurationSchema>;

export interface IConfigurationManager {
  getConfig(): Configuration;
  validateConfig(config: Partial<Configuration>): boolean;
  watchConfig(): void;
  updateConfig(updates: Partial<Configuration>): void;
}