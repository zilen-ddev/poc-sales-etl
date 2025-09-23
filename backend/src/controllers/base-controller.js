/**
 * Base Controller
 * Common functionality for all controllers - Single Responsibility Principle
 */
const ResponseHelper = require('../utils/response-helper');
const ErrorHandler = require('../utils/error-handler');

class BaseController {
  constructor() {
    this.responseHelper = ResponseHelper;
    this.errorHandler = ErrorHandler;
  }

  /**
   * Handle processing results with common error handling
   * @param {Function} processingFunction - Function to execute
   * @param {Object} context - Context data
   * @returns {Object} Response object
   */
  async handleProcessing(processingFunction, context = {}) {
    const startTime = Date.now();
    console.log(`Starting ${context.operation}`, context);

    try {
      const results = await processingFunction();
      const duration = Date.now() - startTime;
      
      console.log(`Completed ${context.operation}`, {
        ...context,
        duration: `${duration}ms`
      });

      return this.responseHelper.batchProcessing(results, context.operation);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed ${context.operation}`, error, { ...context, duration });
      
      const errorInfo = this.errorHandler.handleError(error, context);
      return this.responseHelper.error(
        errorInfo.message,
        errorInfo.statusCode,
        {},
        errorInfo.context
      );
    }
  }

  /**
   * Process records with error tracking
   * @param {Array} records - Records to process
   * @param {Function} processRecord - Function to process each record
   * @returns {Object} Processing results
   */
  async processRecords(records, processRecord) {
    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };

    for (const record of records) {
      try {
        await processRecord(record);
        results.processed++;
      } catch (error) {
        results.failed++;
        const errorInfo = this.errorHandler.handleError(error, { record });
        results.errors.push({
          record: this.extractRecordInfo(record),
          error: errorInfo.message,
          type: errorInfo.type
        });
      }
    }

    return results;
  }

  /**
   * Extract relevant information from record
   * @param {Object} record - Record object
   * @returns {Object} Extracted info
   */
  extractRecordInfo(record) {
    if (record.s3) {
      return {
        bucket: record.s3.bucket?.name,
        key: record.s3.object?.key
      };
    }
    if (record.messageId) {
      return {
        messageId: record.messageId,
        receiptHandle: record.receiptHandle
      };
    }
    return { record };
  }
}

module.exports = BaseController;
