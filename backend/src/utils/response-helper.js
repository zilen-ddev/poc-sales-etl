/**
 * Centralized Response Helper
 * Provides consistent API response structure across all Lambda functions
 */

class ResponseHelper {
  /**
   * Creates a successful response
   * @param {Object} data - Response data
   * @param {number} statusCode - HTTP status code (default: 200)
   * @param {Object} headers - Additional headers
   * @returns {Object} Lambda response object
   */
  static success(data, statusCode = 200, headers = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    return {
      statusCode,
      headers: { ...defaultHeaders, ...headers },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        data
      })
    };
  }

  /**
   * Creates an error response
   * @param {string|Error} error - Error message or Error object
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {Object} headers - Additional headers
   * @param {Object} details - Additional error details
   * @returns {Object} Lambda response object
   */
  static error(error, statusCode = 500, headers = {}, details = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    return {
      statusCode,
      headers: { ...defaultHeaders, ...headers },
      body: JSON.stringify({
        success: false,
        timestamp: new Date().toISOString(),
        error: {
          message: errorMessage,
          code: this.getErrorCode(statusCode),
          details: details,
          ...(process.env.NODE_ENV === 'development' && errorStack && { stack: errorStack })
        }
      })
    };
  }

  /**
   * Creates a validation error response
   * @param {Array} validationErrors - Array of validation errors
   * @param {Object} details - Additional details
   * @returns {Object} Lambda response object
   */
  static validationError(validationErrors, details = {}) {
    return this.error(
      'Validation failed',
      400,
      {},
      {
        validationErrors,
        ...details
      }
    );
  }

  /**
   * Creates a processing summary response
   * @param {Object} summary - Processing summary data
   * @param {string} message - Success message
   * @returns {Object} Lambda response object
   */
  static processingSummary(summary, message = 'Processing completed') {
    return this.success({
      message,
      summary: {
        processed: summary.processed || 0,
        failed: summary.failed || 0,
        total: (summary.processed || 0) + (summary.failed || 0),
        errors: summary.errors || [],
        ...summary
      }
    });
  }

  /**
   * Maps HTTP status codes to error codes
   * @param {number} statusCode - HTTP status code
   * @returns {string} Error code
   */
  static getErrorCode(statusCode) {
    const errorCodes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    };
    return errorCodes[statusCode] || 'UNKNOWN_ERROR';
  }

  /**
   * Creates a batch processing response
   * @param {Object} results - Batch processing results
   * @param {string} operation - Operation name
   * @returns {Object} Lambda response object
   */
  static batchProcessing(results, operation = 'Batch processing') {
    const { processed = 0, failed = 0, errors = [] } = results;
    
    if (failed === 0) {
      return this.success({
        message: `${operation} completed successfully`,
        summary: {
          processed,
          failed,
          total: processed + failed,
          errors
        }
      });
    } else if (processed === 0) {
      return this.error(
        `${operation} failed completely`,
        500,
        {},
        {
          summary: {
            processed,
            failed,
            total: processed + failed,
            errors
          }
        }
      );
    } else {
      return this.error(
        `${operation} completed with errors`,
        207, // Multi-status
        {},
        {
          summary: {
            processed,
            failed,
            total: processed + failed,
            errors
          }
        }
      );
    }
  }
}

module.exports = ResponseHelper;
