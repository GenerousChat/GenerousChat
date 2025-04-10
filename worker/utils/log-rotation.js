const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const MAX_LOG_FILES = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function rotateLogs() {
    const logsDir = path.join(__dirname, '../logs');
    const logFiles = ['error.log', 'combined.log'];

    logFiles.forEach(filename => {
        const filePath = path.join(logsDir, filename);

        try {
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
            logger.error(`Error rotating log file ${filename}:`, error);
        }
    });
}

// Run log rotation check every hour
setInterval(rotateLogs, 60 * 60 * 1000);

// Export for manual rotation if needed
module.exports = rotateLogs;
