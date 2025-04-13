import morgan from 'morgan';
import logger from '../config/logger.js';
import { Request } from 'express';

// Create a write stream for morgan that writes to our winston logger
const stream = {
    write: (message: string) => logger.info(message.trim())
};

// Define a type for the request with body
interface RequestWithBody extends Request {
    body: Record<string, any>;
}

// Create custom morgan token for request body
morgan.token('body', (req: RequestWithBody) => {
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

export default morganMiddleware;
