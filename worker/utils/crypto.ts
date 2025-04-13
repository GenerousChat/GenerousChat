/**
 * Cryptographic utilities for Pusher authentication
 */
import crypto from 'crypto';

/**
 * Calculate MD5 hash of a string
 * @param str - String to hash
 * @returns MD5 hash
 */
function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Generate Pusher authentication signature
 * @param stringToSign - String to sign
 * @param secret - Secret key
 * @returns HMAC SHA256 signature
 */
function generatePusherSignature(stringToSign: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
}

export {
  md5,
  generatePusherSignature
};

// Also export as default for compatibility with existing imports
const cryptoUtils = {
  md5,
  generatePusherSignature
};

export default cryptoUtils;
