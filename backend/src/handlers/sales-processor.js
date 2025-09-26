/**
 * Sales Processor Lambda Handler
 * Handles SQS events for sales data processing
 */
const SalesProcessorController = require('../controllers/sales-processor-controller');
const ErrorHandler = require('../utils/error-handler');
const ResponseHelper = require('../utils/response-helper');

const controller = new SalesProcessorController();

/**
 * Lambda handler for sales processing
 * @param {Object} event - SQS event containing sales data messages
 * @returns {Object} Lambda response object
 */
exports.handler = async (event) => {
  try {
    return await controller.handleSqsEvent(event);
  } catch (error) {
    console.error('Sales Processor handler error:', error);
    const errorInfo = ErrorHandler.handleError(error, { 
      operation: 'Sales Processor Handler',
      eventSource: 'SQS'
    });
    return ResponseHelper.error(
      errorInfo.message,
      errorInfo.statusCode,
      {},
      errorInfo.context
    );
  }
};
