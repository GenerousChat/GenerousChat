/**
 * Logger utility for consistent logging
 */

/**
 * Log levels enum
 */
enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

/**
 * Format a log message with timestamp and level
 * @param level - Log level
 * @param message - Log message
 * @returns Formatted log message
 */
function formatLogMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Log an info message
 * @param message - Message to log
 * @param data - Optional data to log
 */
function info(message: string, data?: any): void {
  console.log(formatLogMessage(LogLevel.INFO, message), data ? data : '');
}

/**
 * Log a warning message
 * @param message - Message to log
 * @param data - Optional data to log
 */
function warn(message: string, data?: any): void {
  console.warn(formatLogMessage(LogLevel.WARN, message), data ? data : '');
}

/**
 * Log an error message
 * @param message - Message to log
 * @param error - Optional error to log
 */
function error(message: string, error?: Error | any): void {
  console.error(formatLogMessage(LogLevel.ERROR, message), error ? error : '');
}

/**
 * Log a debug message (only in non-production environments)
 * @param message - Message to log
 * @param data - Optional data to log
 */
function debug(message: string, data?: any): void {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(formatLogMessage(LogLevel.DEBUG, message), data ? data : '');
  }
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
