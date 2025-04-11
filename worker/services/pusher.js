/**
 * Pusher service for real-time messaging
 */
const https = require('https');
const config = require('../config');
const { md5, generatePusherSignature } = require('../utils/crypto');
const logger = require('../utils/logger');

// Pusher configuration
const pusherConfig = {
  appId: config.pusher.appId || '1971423',
  key: config.pusher.key || '96f9360f34a831ca1901',
  secret: config.pusher.secret || 'c508bc54a2ca619cfab8',
  cluster: config.pusher.cluster || 'us3',
};

/**
 * Send event to Pusher
 * @param {string} channel - Channel name
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Response from Pusher
 */
async function sendToPusher(channel, eventName, data) {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const eventData = JSON.stringify(data);
      logger.info(`Preparing to send Pusher event: ${eventName} to channel: ${channel}`);
      logger.debug(`Event data type: ${typeof data}, stringified length: ${eventData.length}`);

      const body = JSON.stringify({
        name: eventName,
        channel: channel,
        data: eventData,
      });

      const bodyMd5 = md5(body);
      const stringToSign = `POST\n/apps/${pusherConfig.appId}/events\nauth_key=${pusherConfig.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
      const signature = generatePusherSignature(stringToSign, pusherConfig.secret);

      const options = {
        hostname: `api-${pusherConfig.cluster}.pusher.com`,
        port: 443,
        path: `/apps/${pusherConfig.appId}/events`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      // Add query parameters
      options.path += `?auth_key=${pusherConfig.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}&auth_signature=${signature}`;

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            logger.info(`Event sent to Pusher: ${eventName} on channel ${channel}`);
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            logger.error(`Failed to send event to Pusher: ${res.statusCode} - ${responseData}`);
            reject(new Error(`Failed to send event: ${res.statusCode} - ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        logger.error('Error sending event to Pusher:', error);
        reject(error);
      });

      req.write(body);
      req.end();
    } catch (error) {
      logger.error('Error in sendToPusher:', error);
      reject(error);
    }
  });
}

/**
 * Send a new message event to a room channel
 * @param {string} roomId - Room ID
 * @param {Object} message - Message object
 * @returns {Promise<Object>} Response from Pusher
 */
async function sendNewMessage(roomId, message) {
  return sendToPusher(`room-${roomId}`, 'new-message', {
    id: message.id,
    content: message.content,
    created_at: message.created_at,
    user_id: message.user_id,
  });
}

/**
 * Send a user joined event to a room channel
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID
 * @param {string} joinedAt - Join timestamp
 * @returns {Promise<Object>} Response from Pusher
 */
async function sendUserJoined(roomId, userId, joinedAt) {
  return sendToPusher(`room-${roomId}`, 'user-joined', {
    user_id: userId,
    joined_at: joinedAt,
  });
}

/**
 * Send a user left event to a room channel
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Response from Pusher
 */
async function sendUserLeft(roomId, userId) {
  return sendToPusher(`room-${roomId}`, 'user-left', {
    user_id: userId,
  });
}

/**
 * Send an HTML visualization event to a room channel
 * @param {string} roomId - Room ID
 * @param {Object} visualization - Visualization object
 * @returns {Promise<Object>} Response from Pusher
 */
async function sendHtmlVisualization(roomId, visualization) {
  return sendToPusher(`room-${roomId}`, 'html-visualization', visualization);
}

/**
 * Send a new generation notification to a room channel
 * @param {string} roomId - Room ID
 * @param {string} generationId - Generation ID
 * @param {string} type - Generation type
 * @param {string} createdAt - Creation timestamp
 * @returns {Promise<Object>} Response from Pusher
 */
async function sendNewGeneration(roomId, generationId, type, createdAt) {
  return sendToPusher(`room-${roomId}`, 'new-generation', {
    generation_id: generationId,
    type: type,
    created_at: createdAt,
  });
}

module.exports = {
  sendToPusher,
  sendNewMessage,
  sendUserJoined,
  sendUserLeft,
  sendHtmlVisualization,
  sendNewGeneration,
};
