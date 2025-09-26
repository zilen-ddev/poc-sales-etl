/**
 * Centralized Error Handler
 * Provides consistent error handling and logging across all Lambda functions
 */

class ErrorHandler {
  /**
   * Custom error types
   */
  static ErrorTypes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PROCESSING_ERROR: 'PROCESSING_ERROR',
    AWS_ERROR: 'AWS_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  };

  /**
   * Custom error class
   */
  static AppError = class extends Error {
    constructor(message, type = ErrorHandler.ErrorTypes.UNKNOWN_ERROR, statusCode = 500, details = {}) {
      super(message);
      this.name = 'AppError';
      this.type = type;
      this.statusCode = statusCode;
      this.details = details;
      this.timestamp = new Date().toISOString();
    }
  };

  /**
   * Handles and logs errors consistently
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context information
   * @returns {Object} Processed error information
   */
  static handleError(error, context = {}) {
    const errorInfo = this.processError(error, context);
    this.logError(errorInfo);
    return errorInfo;
  }

  /**
   * Processes an error and extracts relevant information
   * @param {Error} error - The error to process
   * @param {Object} context - Additional context information
   * @returns {Object} Processed error information
   */
  static processError(error, context = {}) {
    const errorInfo = {
      message: error.message || 'Unknown error occurred',
      type: this.getErrorType(error),
      statusCode: this.getStatusCode(error),
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        stack: error.stack,
        name: error.name
      }
    };

    // Add AWS-specific error information
    if (error.code) {
      errorInfo.awsError = {
        code: error.code,
        requestId: error.requestId,
        statusCode: error.statusCode
      };
    }

    // Add validation errors if present
    if (error.validationErrors) {
      errorInfo.validationErrors = error.validationErrors;
    }

    return errorInfo;
  }

  /**
   * Determines the error type based on the error
   * @param {Error} error - The error to analyze
   * @returns {string} Error type
   */
  static getErrorType(error) {
    if (error instanceof this.AppError) {
      return error.type;
    }

    if (error.code && error.code.startsWith('Validation')) {
      return this.ErrorTypes.VALIDATION_ERROR;
    }

    if (error.code && error.code.startsWith('AWS')) {
      return this.ErrorTypes.AWS_ERROR;
    }

    if (error.message && error.message.includes('timeout')) {
      return this.ErrorTypes.TIMEOUT_ERROR;
    }

    if (error.message && error.message.includes('configuration')) {
      return this.ErrorTypes.CONFIGURATION_ERROR;
    }

    return this.ErrorTypes.UNKNOWN_ERROR;
  }

  /**
   * Determines the appropriate HTTP status code
   * @param {Error} error - The error to analyze
   * @returns {number} HTTP status code
   */
  static getStatusCode(error) {
    if (error instanceof this.AppError) {
      return error.statusCode;
    }

    if (error.code === 'ValidationException') {
      return 400;
    }

    if (error.code === 'AccessDenied' || error.code === 'UnauthorizedOperation') {
      return 403;
    }

    if (error.code === 'NoSuchKey' || error.code === 'NoSuchBucket') {
      return 404;
    }

    if (error.code === 'ResourceNotFoundException') {
      return 404;
    }

    if (error.code === 'ThrottlingException' || error.code === 'TooManyRequestsException') {
      return 429;
    }

    if (error.code === 'ServiceUnavailable' || error.code === 'InternalError') {
      return 503;
    }

    return 500;
  }

  /**
   * Logs error information
   * @param {Object} errorInfo - Processed error information
   */
  static logError(errorInfo) {
    const logLevel = this.getLogLevel(errorInfo.statusCode);
    
    const logData = {
      level: logLevel,
      message: errorInfo.message,
      type: errorInfo.type,
      statusCode: errorInfo.statusCode,
      timestamp: errorInfo.timestamp,
      context: errorInfo.context
    };

    if (logLevel === 'ERROR') {
      console.error(JSON.stringify(logData));
    } else if (logLevel === 'WARN') {
      console.warn(JSON.stringify(logData));
    } else {
      console.log(JSON.stringify(logData));
    }
  }

  /**
   * Determines the appropriate log level based on status code
   * @param {number} statusCode - HTTP status code
   * @returns {string} Log level
   */
  static getLogLevel(statusCode) {
    if (statusCode >= 500) {
      return 'ERROR';
    } else if (statusCode >= 400) {
      return 'WARN';
    } else {
      return 'INFO';
    }
  }

  /**
   * Creates a validation error
   * @param {string} message - Error message
   * @param {Array} validationErrors - Array of validation errors
   * @param {Object} details - Additional details
   * @returns {AppError} Validation error
   */
  static createValidationError(message, validationErrors = [], details = {}) {
    const error = new this.AppError(message, this.ErrorTypes.VALIDATION_ERROR, 400, details);
    error.validationErrors = validationErrors;
    return error;
  }

  /**
   * Creates a processing error
   * @param {string} message - Error message
   * @param {Object} details - Additional details
   * @returns {AppError} Processing error
   */
  static createProcessingError(message, details = {}) {
    return new this.AppError(message, this.ErrorTypes.PROCESSING_ERROR, 500, details);
  }

  /**
   * Creates an AWS error
   * @param {string} message - Error message
   * @param {Object} awsError - AWS error details
   * @param {Object} details - Additional details
   * @returns {AppError} AWS error
   */
  static createAwsError(message, awsError = {}, details = {}) {
    return new this.AppError(message, this.ErrorTypes.AWS_ERROR, 500, { ...details, awsError });
  }

  /**
   * Creates a configuration error
   * @param {string} message - Error message
   * @param {Object} details - Additional details
   * @returns {AppError} Configuration error
   */
  static createConfigurationError(message, details = {}) {
    return new this.AppError(message, this.ErrorTypes.CONFIGURATION_ERROR, 500, details);
  }

  /**
   * Wraps async functions with error handling
   * @param {Function} asyncFn - Async function to wrap
   * @param {Object} context - Context information
   * @returns {Function} Wrapped function
   */
  static wrapAsync(asyncFn, context = {}) {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        throw this.handleError(error, context);
      }
    };
  }
}

module.exports = ErrorHandler;
