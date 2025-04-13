import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

interface CustomError extends Error {
  name: string;
  message: string;
  details?: string;
}

/**
 * Error handling middleware
 * Processes errors and returns appropriate HTTP responses
 */
const errorHandler: ErrorRequestHandler = (
  err: CustomError, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
    return;
  }

  if (err.name === 'AuthenticationError') {
    res.status(401).json({
      error: 'Authentication Error',
      message: 'Not authenticated'
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
};

export default errorHandler;
