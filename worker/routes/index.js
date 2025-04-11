/**
 * Main router that combines all route handlers
 */
const express = require('express');
const router = express.Router();

// Import route handlers
const healthRoutes = require('./health');
const pusherRoutes = require('./pusher');
const aiRoutes = require('./ai');

// Register routes
router.use('/health', healthRoutes);
router.use('/test-pusher', pusherRoutes);
router.use('/ai', aiRoutes);

// Root health check
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Supabase to Pusher bridge worker is running' });
});

module.exports = router;
