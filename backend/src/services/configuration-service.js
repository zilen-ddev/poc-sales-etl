/**
 * Configuration Service
 * Handles environment configuration - Single Responsibility Principle
 */
const ErrorHandler = require('../utils/error-handler');

class ConfigurationService {
  constructor() {
    this.config = this.loadConfiguration();
  }

  loadConfiguration() {
    return {
      processingQueueUrl: process.env.PROCESSING_QUEUE_URL,
      validationFailedQueueUrl: process.env.VALIDATION_FAILED_QUEUE_URL,
      snsTopicArn: process.env.SNS_TOPIC_ARN,
      logLevel: process.env.LOG_LEVEL || 'INFO',
      nodeEnv: process.env.NODE_ENV || 'development'
    };
  }

  getProcessingQueueUrl() {
    if (!this.config.processingQueueUrl) {
      throw ErrorHandler.createConfigurationError('Missing PROCESSING_QUEUE_URL environment variable');
    }
    return this.config.processingQueueUrl;
  }

  getValidationFailedQueueUrl() {
    if (!this.config.validationFailedQueueUrl) {
      throw ErrorHandler.createConfigurationError('Missing VALIDATION_FAILED_QUEUE_URL environment variable');
    }
    return this.config.validationFailedQueueUrl;
  }

  getSnsTopicArn() {
    return this.config.snsTopicArn;
  }

  getLogLevel() {
    return this.config.logLevel;
  }

  getNodeEnv() {
    return this.config.nodeEnv;
  }

  isDevelopment() {
    return this.config.nodeEnv === 'development';
  }

  isProduction() {
    return this.config.nodeEnv === 'production';
  }

  validateRequiredConfig() {
    const errors = [];
    
    if (!this.config.processingQueueUrl) {
      errors.push('PROCESSING_QUEUE_URL is required');
    }
    
    if (!this.config.validationFailedQueueUrl) {
      errors.push('VALIDATION_FAILED_QUEUE_URL is required');
    }

    if (errors.length > 0) {
      throw ErrorHandler.createConfigurationError(
        `Configuration validation failed: ${errors.join(', ')}`,
        { validationErrors: errors }
      );
    }
  }
}

module.exports = ConfigurationService;
