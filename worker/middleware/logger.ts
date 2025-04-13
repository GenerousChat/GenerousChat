import morgan from 'morgan';
import winston from 'winston';

/**
 * Configure winston logger
 * Logs information to files and console based on environment
 */
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

/**
 * Request logging middleware
 * Uses morgan to format HTTP request logs and sends them to winston
 */
const requestLogger = morgan('combined', {
    stream: {
        write: (message: string) => logger.info(message.trim())
    }
});

export {
    logger,
    requestLogger
};
