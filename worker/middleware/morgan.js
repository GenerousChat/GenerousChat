const morgan = require('morgan');
const logger = require('../config/logger');

// Create a write stream for morgan that writes to our winston logger
const stream = {
    write: (message) => logger.info(message.trim())
};

// Create custom morgan token for request body
morgan.token('body', (req) => {
    if (req.body) {
        const bodyClone = { ...req.body };
        // Remove sensitive information if present
        delete bodyClone.password;
        delete bodyClone.token;
        return JSON.stringify(bodyClone);
    }
    return '';
});

// Configure morgan middleware
const morganMiddleware = morgan(
    // Define format string
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :body',
    { stream }
);

module.exports = morganMiddleware;
