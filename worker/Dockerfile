FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Create a .env file if it doesn't exist (will be overridden by secrets in production)
RUN touch .env

# Expose the port the app runs on
EXPOSE 3001

# Start the application
CMD ["node", "index.js"]
