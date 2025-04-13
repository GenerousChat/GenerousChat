import fs from 'fs';
import path from 'path';
import logger from '../config/logger.js';

const MAX_LOG_FILES = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Rotates log files when they exceed the maximum size
 * Creates backup files with incrementing numbers and removes the oldest logs
 */
function rotateLogs(): void {
    const logsDir = path.join(__dirname, '../logs');
    const logFiles = ['error.log', 'combined.log'];

    logFiles.forEach(filename => {
        const filePath = path.join(logsDir, filename);

        try {
            // Check if file exists before attempting to rotate
            if (!fs.existsSync(filePath)) {
                logger.debug(`Log file does not exist: ${filename}`);
                return;
            }

            const stats = fs.statSync(filePath);
            
            if (stats.size >= MAX_FILE_SIZE_BYTES) {
                // Rotate existing backup files
                for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
                    const oldFile = path.join(logsDir, `${filename}.${i}`);
                    const newFile = path.join(logsDir, `${filename}.${i + 1}`);
                    
                    if (fs.existsSync(oldFile)) {
                        if (i === MAX_LOG_FILES - 1) {
                            fs.unlinkSync(oldFile); // Remove oldest file
                        } else {
                            fs.renameSync(oldFile, newFile);
                        }
                    }
                }

                // Rename current log file
                fs.renameSync(filePath, path.join(logsDir, `${filename}.1`));
                
                // Create new empty log file
                fs.writeFileSync(filePath, '');
                
                logger.info(`Rotated log file: ${filename}`);
            }
        } catch (error) {
            logger.error(`Error rotating log file ${filename}:`, error instanceof Error ? error.message : String(error));
        }
    });
}

// Run log rotation check every hour
setInterval(rotateLogs, 60 * 60 * 1000);

export default rotateLogs;
