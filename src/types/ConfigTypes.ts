import { z } from 'zod';

export const ProviderConfigSchema = z.object({
  name: z.string(),
  priority: z.number().int().min(1).default(1),
  config: z.record(z.any()).optional(),
});

export const ConfigurationSchema = z.object({
  defaultFormat: z.string().default('iso'),
  defaultProvider: z.string().default('local'),
  providers: z.record(ProviderConfigSchema).default({
    local: {
      name: 'local',
      priority: 1,
    },
  }),
  debug: z.boolean().default(false),
  // 'error', not 'info': the server sets the logger to error at construction, and a
  // louder schema default would silently override that once config loads.
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('error'),
});

export type Configuration = z.infer<typeof ConfigurationSchema>;
