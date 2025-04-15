FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies including dev dependencies needed for build
RUN npm install

# Copy the main tsconfig.json
COPY tsconfig.json ./

# Copy the worker directory with its tsconfig.json
COPY worker/ ./worker/

# Create the dist directory if it doesn't exist
RUN mkdir -p ./worker/dist

# Build the worker using the npm script
RUN npm run worker:build

# Create a .env file if it doesn't exist (will be overridden by secrets in production)
RUN touch .env

# Expose the port the app runs on
EXPOSE 3001

# Start the worker
CMD ["npm", "run", "worker:start"]
