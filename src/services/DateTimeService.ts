import { IDateTimeService, DateTimeOptions } from '../types/DateTimeTypes';
import { ProviderFactory } from '../providers/ProviderFactory';
import { DateFormatter } from '../utils/DateFormatter';
import { Validator } from '../utils/Validator';
import { Logger } from '../utils/Logger';
import { DateTimeError, ProviderError } from '../types/MCPTypes';
import { Configuration } from '../types/ConfigTypes';

export class DateTimeService implements IDateTimeService {
  private providerFactory: ProviderFactory;
  private logger: Logger;
  private config?: Configuration;

  constructor(config?: Configuration) {
    this.providerFactory = new ProviderFactory();
    this.logger = Logger.getInstance();
    this.config = config;

    if (config?.debug) {
      this.logger.setLogLevel('debug');
    } else if (config?.logLevel) {
      this.logger.setLogLevel(config.logLevel);
    }
  }

  async getCurrentDateTime(options?: DateTimeOptions): Promise<string> {
    const correlationId = `dt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.logger.setCorrelationId(correlationId);

    this.logger.debug('DateTime service request started', { options, correlationId });

    try {
      // Sanitize and validate input
      const sanitizedOptions = Validator.sanitizeInput(options);
      const validation = Validator.validateDateTimeOptions(sanitizedOptions);
      
      if (!validation.success) {
        throw new DateTimeError(
          `Invalid options: ${validation.errors?.join(', ')}`,
          -1,
          undefined,
          sanitizedOptions?.format
        );
      }

      const validOptions = validation.data as DateTimeOptions;
      
      // Apply defaults from configuration
      const format = validOptions.format || this.config?.defaultFormat || 'iso';
      const providerName = validOptions.provider || this.config?.defaultProvider || 'local';

      this.logger.debug('Processing datetime request', { 
        format, 
        providerName, 
        correlationId 
      });

      // Validate provider availability
      const availableProviders = this.providerFactory.getAvailableProviders();
      if (!Validator.validateProvider(providerName, availableProviders)) {
        throw new ProviderError(
          `Provider '${providerName}' is not available. Available providers: ${availableProviders.join(', ')}`,
          providerName,
          false
        );
      }

      // Get datetime from provider with fallback
      let currentDate: Date;
      try {
        const provider = this.providerFactory.create(providerName, this.config);
        currentDate = await provider.getCurrentDateTime();
        
        this.logger.debug('Successfully retrieved datetime from provider', {
          provider: providerName,
          datetime: currentDate.toISOString(),
          correlationId
        });
      } catch (error) {
        this.logger.warn('Primary provider failed, attempting fallback', {
          provider: providerName,
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId
        });

        // Try fallback providers
        try {
          const fallbackProvider = await this.providerFactory.getAvailableProvider(['local']);
          currentDate = await fallbackProvider.getCurrentDateTime();
          
          this.logger.info('Successfully used fallback provider', {
            fallbackProvider: fallbackProvider.getName(),
            correlationId
          });
        } catch (fallbackError) {
          throw new ProviderError(
            `All providers failed. Primary: ${error instanceof Error ? error.message : 'Unknown'}. Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`,
            'all',
            false
          );
        }
      }

      // Validate retrieved date
      if (!Validator.isValidDate(currentDate)) {
        throw new DateTimeError(
          'Invalid date returned from provider',
          -1,
          providerName
        );
      }

      // Format the datetime
      const formattedDateTime = DateFormatter.format(currentDate, format);

      this.logger.debug('DateTime request completed successfully', {
        format,
        provider: providerName,
        result: formattedDateTime,
        correlationId
      });

      return formattedDateTime;

    } catch (error) {
      this.logger.error('DateTime service request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        correlationId
      });

      if (error instanceof DateTimeError || error instanceof ProviderError) {
        throw error;
      }

      throw new DateTimeError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        -1
      );
    }
  }

  validateFormat(format: string): boolean {
    return DateFormatter.validateFormat(format);
  }

  getSupportedProviders(): string[] {
    return this.providerFactory.getAvailableProviders();
  }

  getSupportedFormats(): string[] {
    return [
      'iso',
      ...Object.keys(DateFormatter.getPredefinedFormats()),
      'custom (using YYYY, MM, DD, HH, mm, ss, SSS tokens)'
    ];
  }

  getFormatExample(format: string): string {
    return DateFormatter.getFormatExample(format);
  }

  updateConfiguration(config: Configuration): void {
    this.config = config;
    
    if (config.debug) {
      this.logger.setLogLevel('debug');
    } else if (config.logLevel) {
      this.logger.setLogLevel(config.logLevel);
    }

    // Clear provider instances to pick up new configuration
    this.providerFactory.clear();
    
    this.logger.info('Configuration updated', { 
      defaultFormat: config.defaultFormat,
      defaultProvider: config.defaultProvider,
      debug: config.debug 
    });
  }
}