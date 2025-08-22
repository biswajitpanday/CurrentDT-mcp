import { IDateTimeProvider } from './IDateTimeProvider';
import { LocalProvider } from './LocalProvider';
import { RemoteProvider, RemoteProviderOptions } from './RemoteProvider';
import { ProviderError } from '../types/MCPTypes';
import { Configuration } from '../types/ConfigTypes';

export class ProviderFactory {
  private providers = new Map<string, () => IDateTimeProvider>();
  private instances = new Map<string, IDateTimeProvider>();

  constructor() {
    this.registerBuiltInProviders();
  }

  private registerBuiltInProviders(): void {
    this.register('local', () => new LocalProvider());
    
    this.register('remote', () => new RemoteProvider({
      url: 'https://worldtimeapi.org/api/timezone/UTC',
      timeout: 5000,
      priority: 2,
    }));
  }

  register(name: string, factory: () => IDateTimeProvider): void {
    this.providers.set(name, factory);
    // Clear any existing instance when re-registering
    this.instances.delete(name);
  }

  create(name: string, config?: Configuration): IDateTimeProvider {
    // Return cached instance if available
    const existingInstance = this.instances.get(name);
    if (existingInstance) {
      return existingInstance;
    }

    const factory = this.providers.get(name);
    if (!factory) {
      throw new ProviderError(`Provider '${name}' not found`, name, false);
    }

    let instance: IDateTimeProvider;

    try {
      // Handle special configuration for remote provider
      if (name === 'remote' && config?.providers?.remote) {
        const remoteConfig = config.providers.remote;
        if (remoteConfig.config?.url) {
          const options: RemoteProviderOptions = {
            url: remoteConfig.config.url,
            timeout: remoteConfig.config.timeout || 5000,
            priority: remoteConfig.priority || 2,
          };
          instance = new RemoteProvider(options);
        } else {
          instance = factory();
        }
      } else {
        instance = factory();
      }

      // Cache the instance
      this.instances.set(name, instance);
      return instance;
    } catch (error) {
      throw new ProviderError(
        `Failed to create provider '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        name,
        false
      );
    }
  }

  getDefaultProvider(): IDateTimeProvider {
    return this.create('local');
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async getAvailableProvider(preferredProviders: string[] = ['local']): Promise<IDateTimeProvider> {
    // Try preferred providers in order
    for (const providerName of preferredProviders) {
      try {
        const provider = this.create(providerName);
        if (await provider.isAvailable()) {
          return provider;
        }
      } catch (error) {
        // Continue to next provider
        continue;
      }
    }

    // Fallback to any available provider
    for (const providerName of this.getAvailableProviders()) {
      try {
        const provider = this.create(providerName);
        if (await provider.isAvailable()) {
          return provider;
        }
      } catch (error) {
        // Continue to next provider
        continue;
      }
    }

    throw new ProviderError('No available datetime providers found', 'unknown', false);
  }

  clear(): void {
    this.instances.clear();
  }
}