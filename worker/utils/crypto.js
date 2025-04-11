/**
 * Cryptographic utilities for Pusher authentication
 */
const crypto = require('crypto');

/**
 * Calculate MD5 hash of a string
 * @param {string} str - String to hash
 * @returns {string} MD5 hash
 */
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Generate Pusher authentication signature
 * @param {string} stringToSign - String to sign
 * @param {string} secret - Secret key
 * @returns {string} HMAC SHA256 signature
 */
function generatePusherSignature(stringToSign, secret) {
  return crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
}

module.exports = {
  md5,
  generatePusherSignature
};
