/**
 * A simple class to track which messages have already been responded to
 * This helps prevent duplicate AI responses to the same message
 */
class MessageTracker {
  constructor() {
    this.processedMessages = new Map();
    // Set up automatic cleanup every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Check if a message has already been processed
   * @param {string} messageId - The ID of the message to check
   * @returns {boolean} - True if the message has already been processed
   */
  isProcessed(messageId) {
    return this.processedMessages.has(messageId);
  }

  /**
   * Mark a message as processed
   * @param {string} messageId - The ID of the message to mark
   */
  markAsProcessed(messageId) {
    this.processedMessages.set(messageId, Date.now());
    console.log(`Marked message ${messageId} as processed`);
    console.log(`Currently tracking ${this.processedMessages.size} processed messages`);
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    let cleanupCount = 0;
    
    for (const [messageId, timestamp] of this.processedMessages.entries()) {
      if (timestamp < oneHourAgo) {
        this.processedMessages.delete(messageId);
        cleanupCount++;
      }
    }
    
    if (cleanupCount > 0) {
      console.log(`Cleaned up ${cleanupCount} old message entries. Current size: ${this.processedMessages.size}`);
    }
  }

  /**
   * Reset the tracker (for testing)
   */
  reset() {
    this.processedMessages.clear();
  }
}

// Export a singleton instance
const messageTracker = new MessageTracker();
module.exports = messageTracker;
