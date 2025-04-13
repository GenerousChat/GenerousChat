FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy only the worker directory
COPY worker /app/worker

# Create a simple JavaScript version of the worker
RUN mkdir -p /app/worker/dist

RUN cd /app/worker && tsc

# Create a .env file if it doesn't exist (will be overridden by secrets in production)
RUN touch .env

# Expose the port the app runs on
EXPOSE 3001

# Start the worker
CMD ["node", "worker/dist/index.js"]
