/**
 * CSV Processor Lambda Handler
 * Handles S3 events for CSV file processing
 */
const CsvProcessorController = require('../controllers/csv-processor-controller');
const ErrorHandler = require('../utils/error-handler');
const ResponseHelper = require('../utils/response-helper');

const controller = new CsvProcessorController();

/**
 * Lambda handler for CSV processing
 * @param {Object} event - S3 event containing file information
 * @returns {Object} Lambda response object
 */
exports.handler = async (event) => {
  try {
    return await controller.handleS3Event(event);
  } catch (error) {
    console.error('CSV Processor handler error:', error);
    const errorInfo = ErrorHandler.handleError(error, { 
      operation: 'CSV Processor Handler',
      eventSource: 'S3'
    });
    return ResponseHelper.error(
      errorInfo.message,
      errorInfo.statusCode,
      {},
      errorInfo.context
    );
  }
};
