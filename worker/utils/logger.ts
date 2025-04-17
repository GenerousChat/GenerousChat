/**
 * Logger utility using Pino for JSON logging
 */
import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'worker', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure log file destination
const logFilePath = path.join(logsDir, 'app.log');

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Configure logger options
const loggerOptions = {
  level: isProduction ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
};

// In production: JSON logs to file only
// In development: Pretty logs to stdout and JSON logs to file
let pinoLogger;

if (isProduction) {
  // Production: JSON logs to file only
  pinoLogger = pino(loggerOptions, pino.destination({
    dest: logFilePath,
    sync: false, // Asynchronous logging for better performance
  }));
} else {
  // Development: Multi-destination logging
  // 1. JSON logs to file
  // 2. Pretty logs to stdout
  const fileStream = pino.destination({
    dest: logFilePath,
    sync: false,
  });
  
  // Create a multi-destination stream that writes to both stdout and file
  const streams = [
    { stream: process.stdout },
    { stream: fileStream },
  ];
  
  // Create a multi-destination logger
  pinoLogger = pino(
    {
      ...loggerOptions,
      // Use pretty formatting for development
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
    },
    pino.multistream(streams)
  );
}

/**
 * Log an info message
 * @param message - Message to log
 * @param data - Optional data to log
 */
function info(message: string, data?: any): void {
  pinoLogger.info(data ? { msg: message, data } : { msg: message });
}

/**
 * Log a warning message
 * @param message - Message to log
 * @param data - Optional data to log
 */
function warn(message: string, data?: any): void {
  pinoLogger.warn(data ? { msg: message, data } : { msg: message });
}

/**
 * Log an error message
 * @param message - Message to log
 * @param error - Optional error to log
 */
function error(message: string, error?: Error | any): void {
  if (error instanceof Error) {
    pinoLogger.error(
      {
        msg: message,
        err: {
          message: error.message,
          stack: error.stack,
          ...error
        }
      }
    );
  } else {
    pinoLogger.error({ msg: message, data: error });
  }
}

/**
 * Log a debug message (only in non-production environments)
 * @param message - Message to log
 * @param data - Optional data to log
 */
function debug(message: string, data?: any): void {
  pinoLogger.debug(data ? { msg: message, data } : { msg: message });
}

// Export as a module with named exports for TypeScript
export {
  info,
  warn,
  error,
  debug,
};

// Also export as default for compatibility with existing imports
const logger = {
  info,
  warn,
  error,
  debug,
};

export default logger;
