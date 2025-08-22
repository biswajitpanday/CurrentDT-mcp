import { IDateTimeProvider } from './IDateTimeProvider';
import { ProviderError } from '../types/MCPTypes';

export interface RemoteProviderOptions {
  url: string;
  timeout: number;
  priority?: number;
}

export class RemoteProvider implements IDateTimeProvider {
  private readonly name = 'remote';
  private readonly url: string;
  private readonly timeout: number;
  private readonly priority: number;

  constructor(options: RemoteProviderOptions) {
    this.url = options.url;
    this.timeout = options.timeout;
    this.priority = options.priority || 2;
  }

  async getCurrentDateTime(): Promise<Date> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ProviderError(
          `Remote provider returned ${response.status}: ${response.statusText}`,
          this.name,
          response.status >= 500
        );
      }

      const data = await response.json() as any;
      
      // Handle different remote time API formats
      let dateString: string;
      if (data.datetime) {
        dateString = data.datetime; // WorldTimeAPI format
      } else if (data.utc_datetime) {
        dateString = data.utc_datetime; // Alternative format
      } else if (data.timestamp) {
        return new Date(data.timestamp * 1000); // Unix timestamp
      } else if (data.iso) {
        dateString = data.iso; // ISO format
      } else {
        throw new ProviderError(
          'Unable to parse datetime from remote provider response',
          this.name,
          false
        );
      }

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new ProviderError(
          `Invalid datetime received from remote provider: ${dateString}`,
          this.name,
          false
        );
      }

      return date;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ProviderError(
            `Remote provider request timed out after ${this.timeout}ms`,
            this.name,
            true
          );
        }

        throw new ProviderError(
          `Failed to fetch datetime from remote provider: ${error.message}`,
          this.name,
          true
        );
      }

      throw new ProviderError(
        'Unknown error occurred while fetching remote datetime',
        this.name,
        true
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Quick health check

      const response = await fetch(this.url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  getName(): string {
    return this.name;
  }

  getPriority(): number {
    return this.priority;
  }
}