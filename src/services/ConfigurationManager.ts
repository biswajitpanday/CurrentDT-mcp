import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Configuration, ConfigurationSchema } from '../types/ConfigTypes';
import { ConfigurationError } from '../types/MCPTypes';
import { Logger } from '../utils/Logger';

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: Configuration;
  private logger: Logger;
  private configPath?: string;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = this.getDefaultConfig();
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  private getDefaultConfig(): Configuration {
    return ConfigurationSchema.parse({});
  }

  private getConfigPaths(): string[] {
    const paths: string[] = [];

    // Environment variable override
    if (process.env.CURRENTDT_CONFIG) {
      paths.push(process.env.CURRENTDT_CONFIG);
    }

    // Project root
    paths.push(join(process.cwd(), 'currentdt-config.json'));
    paths.push(join(process.cwd(), 'config.json'));

    // User home directory
    paths.push(join(homedir(), '.currentdt-config.json'));
    paths.push(join(homedir(), '.config', 'currentdt', 'config.json'));

    return paths;
  }

  async loadConfig(): Promise<void> {
    const configPaths = this.getConfigPaths();

    for (const path of configPaths) {
      try {
        await fs.access(path);
        this.configPath = path;
        this.logger.debug('Found configuration file', { path });
        break;
      } catch {
        // File doesn't exist, try next path
        continue;
      }
    }

    if (this.configPath) {
      try {
        const configContent = await fs.readFile(this.configPath, 'utf-8');
        const configData = JSON.parse(configContent);
        
        this.config = this.validateAndMergeConfig(configData);
        this.logger.debug('Configuration loaded successfully', { 
          path: this.configPath,
          defaultFormat: this.config.defaultFormat,
          defaultProvider: this.config.defaultProvider
        });
      } catch (error) {
        throw new ConfigurationError(
          `Failed to load configuration from ${this.configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          [],
          this.configPath
        );
      }
    } else {
      this.logger.debug('No configuration file found, using defaults');
    }

    // Apply environment variable overrides
    this.applyEnvironmentOverrides();
  }

  private applyEnvironmentOverrides(): void {
    const overrides: Partial<Configuration> = {};

    if (process.env.CURRENTDT_FORMAT) {
      overrides.defaultFormat = process.env.CURRENTDT_FORMAT;
    }

    if (process.env.CURRENTDT_PROVIDER) {
      overrides.defaultProvider = process.env.CURRENTDT_PROVIDER;
    }

    if (process.env.CURRENTDT_DEBUG) {
      overrides.debug = process.env.CURRENTDT_DEBUG.toLowerCase() === 'true';
    }

    if (Object.keys(overrides).length > 0) {
      this.config = { ...this.config, ...overrides };
      this.logger.debug('Applied environment variable overrides', overrides);
    }
  }

  private validateAndMergeConfig(configData: any): Configuration {
    try {
      const result = ConfigurationSchema.safeParse(configData);
      
      if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new ConfigurationError(
          'Configuration validation failed',
          errors,
          this.configPath
        );
      }

      // Merge with defaults
      const defaultConfig = this.getDefaultConfig();
      return { ...defaultConfig, ...result.data };
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new ConfigurationError(
        `Configuration validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [],
        this.configPath
      );
    }
  }

  getConfig(): Configuration {
    return { ...this.config };
  }
}