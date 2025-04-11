/**
 * Logger utility for consistent logging
 */

/**
 * Log levels
 */
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

/**
 * Format a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {Object} [data] - Optional data to log
 */
function info(message, data) {
  console.log(formatLogMessage(LOG_LEVELS.INFO, message), data ? data : '');
}

/**
 * Log a warning message
 * @param {string} message - Message to log
 * @param {Object} [data] - Optional data to log
 */
function warn(message, data) {
  console.warn(formatLogMessage(LOG_LEVELS.WARN, message), data ? data : '');
}

/**
 * Log an error message
 * @param {string} message - Message to log
 * @param {Error|Object} [error] - Optional error to log
 */
function error(message, error) {
  console.error(formatLogMessage(LOG_LEVELS.ERROR, message), error ? error : '');
}

/**
 * Log a debug message (only in non-production environments)
 * @param {string} message - Message to log
 * @param {Object} [data] - Optional data to log
 */
function debug(message, data) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(formatLogMessage(LOG_LEVELS.DEBUG, message), data ? data : '');
  }
}

module.exports = {
  info,
  warn,
  error,
  debug,
};
