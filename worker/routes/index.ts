/**
 * Main router that combines all route handlers
 */
import express, { Request, Response } from 'express';
const router = express.Router();

// Import route handlers
import healthRoutes from './health.js';

// Register routes
router.use('/health', healthRoutes);

// Root health check
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'AI Worker is running' });
});

export default router;
