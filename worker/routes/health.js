/**
 * Health check endpoint
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  logger.info('Health check requested');
  res.status(200).json({ status: 'ok' });
});

module.exports = router;
