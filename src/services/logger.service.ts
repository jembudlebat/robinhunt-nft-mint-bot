import winston from 'winston';
import { LogEntry } from '../types/index.js';

class LoggerService {
  private logger: winston.Logger;
  private memoryLogs: LogEntry[] = [];
  private readonly maxMemoryLogs = 100;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
      ],
    });
  }

  private pushLog(level: 'info' | 'warn' | 'error' | 'debug', message: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    this.memoryLogs.push(entry);
    if (this.memoryLogs.length > this.maxMemoryLogs) {
      this.memoryLogs.shift();
    }
  }

  public info(message: string): void {
    this.logger.info(message);
    this.pushLog('info', message);
  }

  public warn(message: string): void {
    this.logger.warn(message);
    this.pushLog('warn', message);
  }

  public error(message: string, error?: any): void {
    const fullMsg = error ? `${message} | Error: ${error instanceof Error ? error.message : String(error)}` : message;
    this.logger.error(fullMsg);
    this.pushLog('error', fullMsg);
  }

  public debug(message: string): void {
    this.logger.debug(message);
    this.pushLog('debug', message);
  }

  public getRecentLogs(count = 20): LogEntry[] {
    return this.memoryLogs.slice(-count);
  }

  public formatRecentLogsForTelegram(count = 20): string {
    const logs = this.getRecentLogs(count);
    if (logs.length === 0) return 'No logs recorded yet.';
    return logs
      .map(l => `[${l.timestamp.substring(11, 19)}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
  }
}

export const logger = new LoggerService();
