import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Configuration, IConfigurationManager, ConfigurationSchema } from '../types/ConfigTypes';
import { ConfigurationError } from '../types/MCPTypes';
import { Logger } from '../utils/Logger';

export class ConfigurationManager implements IConfigurationManager {
  private static instance: ConfigurationManager;
  private config: Configuration;
  private logger: Logger;
  private configPath?: string;
  private watchers: ((config: Configuration) => void)[] = [];

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

  validateConfig(config: Partial<Configuration>): boolean {
    try {
      const result = ConfigurationSchema.partial().safeParse(config);
      return result.success;
    } catch {
      return false;
    }
  }

  updateConfig(updates: Partial<Configuration>): void {
    const newConfig = { ...this.config, ...updates };
    
    if (!this.validateConfig(newConfig)) {
      throw new ConfigurationError(
        'Invalid configuration update',
        ['Configuration validation failed for update']
      );
    }

    this.config = newConfig as Configuration;
    this.notifyWatchers();
    
    this.logger.info('Configuration updated', updates);
  }

  async saveConfig(): Promise<void> {
    if (!this.configPath) {
      this.configPath = join(process.cwd(), 'currentdt-config.json');
    }

    try {
      const configContent = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configContent, 'utf-8');
      
      this.logger.info('Configuration saved', { path: this.configPath });
    } catch (error) {
      throw new ConfigurationError(
        `Failed to save configuration to ${this.configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [],
        this.configPath
      );
    }
  }

  watchConfig(): void {
    if (!this.configPath) {
      this.logger.debug('No configuration file to watch');
      return;
    }

    // Simple polling-based watching (could be enhanced with fs.watch)
    setInterval(async () => {
      try {
        await fs.stat(this.configPath!); // Check if file exists
        // This is a simplified implementation
        // In a real implementation, we'd check modification time
        // and reload only if the file has changed
      } catch (error) {
        this.logger.warn('Configuration file watch error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }, 30000); // Check every 30 seconds
  }

  onConfigChange(callback: (config: Configuration) => void): void {
    this.watchers.push(callback);
  }

  private notifyWatchers(): void {
    this.watchers.forEach(callback => {
      try {
        callback(this.getConfig());
      } catch (error) {
        this.logger.error('Error in configuration change callback', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  reset(): void {
    this.config = this.getDefaultConfig();
    this.configPath = undefined;
    this.watchers = [];
    this.logger.info('Configuration reset to defaults');
  }
}