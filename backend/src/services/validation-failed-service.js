/**
 * Validation Failed Service
 * Handles validation failure processing operations
 */
const ErrorHandler = require('../utils/error-handler');

class ValidationFailedService {
  /**
   * Processes a validation failure record from SQS message
   * @param {Object} record - SQS record containing validation failure data
   * @returns {Promise<void>}
   */
  async processValidationFailure(record) {
    try {
      const message = JSON.parse(record.body);
      
      console.log(`Processing validation failure`, {
        sourceFile: message.sourceFile,
        rowIndex: message.rowIndex,
        messageId: record.messageId,
        failedAt: message.failedAt
      });
      
      // Log the validation errors for debugging
      if (message.errors && message.errors.length > 0) {
        console.warn('Validation errors detected', {
          sourceFile: message.sourceFile,
          rowIndex: message.rowIndex,
          errors: message.errors,
          errorCount: message.errors.length
        });
      }
      
      if (message.error) {
        console.warn('Processing error in validation failure', {
          sourceFile: message.sourceFile,
          rowIndex: message.rowIndex,
          error: message.error
        });
      }
      
      
      console.log(`Validation failure processed successfully`, {
        sourceFile: message.sourceFile,
        rowIndex: message.rowIndex,
        failedAt: message.failedAt,
        processedAt: new Date().toISOString()
      });
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Validation failure processing failed:', error, {
        messageId: record.messageId,
        receiptHandle: record.receiptHandle
      });
      throw new Error(`Failed to process validation failure: ${error.message}`);
    }
  }
}

module.exports = ValidationFailedService;


