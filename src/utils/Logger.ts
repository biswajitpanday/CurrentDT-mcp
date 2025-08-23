export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private correlationId?: string;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatLogEntry(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      correlationId: this.correlationId,
    };
  }

  private output(logEntry: LogEntry): void {
    const output = JSON.stringify(logEntry);
    
    // Always use stderr for MCP server compatibility
    // stdout is reserved for JSON-RPC communication only
    process.stderr.write(output + '\n');
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatLogEntry('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      this.output(this.formatLogEntry('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatLogEntry('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      this.output(this.formatLogEntry('error', message, context));
    }
  }

  fatal(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('fatal')) {
      this.output(this.formatLogEntry('fatal', message, context));
    }
  }
}