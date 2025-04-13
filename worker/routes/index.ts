/**
 * Main router that combines all route handlers
 */
import express, { Request, Response } from 'express';
const router = express.Router();

// Import route handlers
import healthRoutes from './health.js';
import pusherRoutes from './pusher.js';
import aiRoutes from './ai.js';

// Register routes
router.use('/health', healthRoutes);
router.use('/test-pusher', pusherRoutes);
router.use('/ai', aiRoutes);

// Root health check
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Supabase to Pusher bridge worker is running' });
});

export default router;
