const express = require('express');
const router = express.Router();
const pusherRoutes = require('./pusher');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
router.use('/pusher', pusherRoutes);

module.exports = router;