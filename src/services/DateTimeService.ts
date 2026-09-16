import { IDateTimeService, DateTimeOptions, DateTimeResult, ConvertOptions, ConvertResult } from '../types/DateTimeTypes';
import {
  hostTimeZone,
  assertTimeZone,
  parseIso,
  isoWallClock,
  wallClockToInstant,
  isNearDstTransition,
  formatOffset,
  offsetMinutes,
} from '../utils/TimeZone';
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

  /** The requested format only. Kept for the CLI and for callers that want v1's string. */
  async getCurrentDateTime(options?: DateTimeOptions): Promise<string> {
    return (await this.resolve(options)).formatted;
  }

  /**
   * The current instant stated from every clock at once. This is what the MCP tool
   * returns as structuredContent, so a consumer never has to guess whether a value
   * was UTC or local.
   */
  async resolve(options?: DateTimeOptions): Promise<DateTimeResult> {
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

      // Whether the caller named a provider, checked before zod fills in its default.
      // An explicit choice must fail loudly rather than silently degrading to local time.
      const providerWasRequested = typeof sanitizedOptions?.provider === 'string'
        && sanitizedOptions.provider.length > 0;

      const format = validOptions.format || this.config?.defaultFormat || 'iso';
      const providerName = validOptions.provider || this.config?.defaultProvider || 'local';
      const timezone = validOptions.timezone || hostTimeZone();
      assertTimeZone(timezone);

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
      // Which clock actually answered. On fallback this differs from providerName,
      // and the result says so rather than letting the caller assume.
      let answeredBy = providerName;
      try {
        const provider = this.providerFactory.create(providerName, this.config);
        currentDate = await provider.getCurrentDateTime();
        
        this.logger.debug('Successfully retrieved datetime from provider', {
          provider: providerName,
          datetime: currentDate.toISOString(),
          correlationId
        });
      } catch (error) {
        // Silently substituting local time here would hand back a different clock
        // than the one the caller asked for, with no way to tell.
        if (providerWasRequested) {
          throw new ProviderError(
            `Provider '${providerName}' failed and no fallback was applied because it was requested explicitly: ${error instanceof Error ? error.message : 'Unknown error'}`,
            providerName,
            true
          );
        }

        this.logger.warn('Primary provider failed, attempting fallback', {
          provider: providerName,
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId
        });

        // Try fallback providers
        try {
          const fallbackProvider = await this.providerFactory.getAvailableProvider(['local']);
          currentDate = await fallbackProvider.getCurrentDateTime();
          answeredBy = fallbackProvider.getName();
          
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
      const formattedDateTime = DateFormatter.format(currentDate, format, timezone);
      const result: DateTimeResult = {
        ...this.describe(currentDate, timezone),
        formatted: formattedDateTime,
        provider: answeredBy,
      };

      this.logger.debug('DateTime request completed successfully', {
        format,
        provider: providerName,
        result: formattedDateTime,
        correlationId
      });

      return result;

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

  /** One instant stated from UTC and from `timezone`. Shared by resolve() and convert(). */
  private describe(date: Date, timezone: string): Omit<DateTimeResult, 'formatted' | 'provider'> {
    const iso = date.toISOString();
    return {
      iso,
      utc: iso,
      local: DateFormatter.format(date, 'YYYY-MM-DDTHH:mm:ss.SSSZ', timezone),
      offset: formatOffset(offsetMinutes(date, timezone)),
      timezone,
      epochMs: date.getTime(),
    };
  }

  /**
   * Re-state a time in another zone. The interesting case is the one an LLM gets
   * wrong: an offset-less time read in a zone whose offset depends on the date.
   */
  convert(options: ConvertOptions): ConvertResult {
    const { time, to, format = 'YYYY-MM-DDTHH:mm:ss.SSSZ' } = options;
    assertTimeZone(to);
    if (options.from !== undefined) assertTimeZone(options.from);

    const { date: parsed, hasOffset } = parseIso(time);
    let instant: Date;
    let from: string;

    if (hasOffset) {
      // The string already pins the instant; `from` is at most a label.
      instant = parsed;
      from = options.from ?? 'offset in input';
    } else if (options.from) {
      instant = wallClockToInstant(isoWallClock(time), options.from);
      from = options.from;
    } else {
      throw new DateTimeError(
        `'${time}' has no UTC offset, so it is ambiguous. Either append one (e.g. "+01:00" or "Z") or pass \`from\` naming the zone it was read in.`,
        -1
      );
    }

    return {
      ...this.describe(instant, to),
      formatted: DateFormatter.format(instant, format, to),
      from,
      dstTransition: isNearDstTransition(instant, to),
    };
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
      `custom (using ${Object.keys(DateFormatter.getSupportedTokens()).join(', ')} tokens)`
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