/**
 * Health check endpoint
 */
import express, { Request, Response } from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req: Request, res: Response) => {
  logger.info('Health check requested');
  res.status(200).json({ status: 'ok' });
});

export default router;
