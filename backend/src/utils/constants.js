/**
 * Application Constants
 * Centralized configuration for easy maintenance and updates
 */

const Constants = {
  // SQS Configuration
  SQS: {
    DEFAULT_BATCH_SIZE: 10,
    MAX_BATCH_SIZE: 10 // AWS SQS limit
  }
};

module.exports = Constants;
