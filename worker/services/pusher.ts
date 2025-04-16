/**
 * Pusher service for real-time messaging
 */
import https from 'https';
import config from '../config/index.js';
import { md5, generatePusherSignature } from '../utils/crypto.js';
import logger from '../utils/logger.js';
import { Message } from './supabase.js';

// Define interfaces for Pusher data
interface PusherConfig {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
}

interface PusherResponse {
  success: boolean;
  statusCode: number;
  data?: any;
}

interface MessageData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface VisualizationData {
  html: string;
  metadata?: Record<string, any>;
}

interface NewGenerationData {
  generation_id: string;
  type: string;
  created_at: string;
}

interface StatusMessageData {
  status_type: string;
  message?: string;
}

// Pusher configuration
const pusherConfig: PusherConfig = {
  appId: config.pusher.appId || '1971423',
  key: config.pusher.key || '96f9360f34a831ca1901',
  secret: config.pusher.secret || 'c508bc54a2ca619cfab8',
  cluster: config.pusher.cluster || 'us3',
};

/**
 * Send event to Pusher
 * @param channel - Channel name
 * @param eventName - Event name
 * @param data - Event data
 * @returns Response from Pusher
 */
async function sendToPusher(channel: string, eventName: string, data: any): Promise<PusherResponse> {
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
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
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
      logger.error('Error in sendToPusher:', error instanceof Error ? error.message : String(error));
      reject(error);
    }
  });
}

/**
 * Send a new message event to a room channel
 * @param roomId - Room ID
 * @param message - Message object
 * @returns Response from Pusher
 */
async function sendNewMessage(roomId: string, message: MessageData): Promise<PusherResponse> {
  return sendToPusher(`room-${roomId}`, 'new-message', {
    id: message.id,
    content: message.content,
    created_at: message.created_at,
    user_id: message.user_id,
  });
}

/**
 * Send a user joined event to a room channel
 * @param roomId - Room ID
 * @param userId - User ID
 * @param joinedAt - Join timestamp
 * @returns Response from Pusher
 */
async function sendUserJoined(roomId: string, userId: string, joinedAt: string): Promise<PusherResponse> {
  return sendToPusher(`room-${roomId}`, 'user-joined', {
    user_id: userId,
    joined_at: joinedAt,
  });
}

/**
 * Send a user left event to a room channel
 * @param roomId - Room ID
 * @param userId - User ID
 * @returns Response from Pusher
 */
async function sendUserLeft(roomId: string, userId: string): Promise<PusherResponse> {
  return sendToPusher(`room-${roomId}`, 'user-left', {
    user_id: userId,
  });
}

/**
 * Send an HTML visualization event to a room channel
 * @param roomId - Room ID
 * @param visualization - Visualization object
 * @returns Response from Pusher
 */
async function sendHtmlVisualization(roomId: string, visualization: VisualizationData): Promise<PusherResponse> {
  return sendToPusher(`room-${roomId}`, 'html-visualization', visualization);
}

/**
 * Send a new generation notification to a room channel
 * @param roomId - Room ID
 * @param generationId - Generation ID
 * @param type - Generation type
 * @param createdAt - Creation timestamp
 * @returns Response from Pusher
 */
async function sendNewGeneration(
  roomId: string, 
  generationId: string, 
  type: string, 
  createdAt: string,
  slug: string
): Promise<PusherResponse> {
  return sendToPusher(`room-${roomId}`, 'new-generation', {
    generation_id: generationId,
    type: type,
    created_at: createdAt,
    slug: slug
  });
}

/**
 * Send a status message to a room channel
 * @param roomId - Room ID
 * @param statusType - Status type (join, leave, generation, etc.)
 * @param message - Optional custom message
 * @returns Response from Pusher
 */
async function sendStatusMessage(
  roomId: string, 
  statusType: string, 
  message?: string
): Promise<PusherResponse> {
  return sendToPusher(`room-${roomId}`, 'new-status', {
    status_type: statusType,
    message: message,
  });
}

// Export individual functions
export {
  sendToPusher,
  sendNewMessage,
  sendUserJoined,
  sendUserLeft,
  sendHtmlVisualization,
  sendNewGeneration,
  sendStatusMessage,
};

// Export as default for compatibility with existing imports
const pusherService = {
  sendToPusher,
  sendNewMessage,
  sendUserJoined,
  sendUserLeft,
  sendHtmlVisualization,
  sendNewGeneration,
  sendStatusMessage,
};

export default pusherService;
