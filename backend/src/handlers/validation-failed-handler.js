/**
 * Validation Failed Lambda Handler
 * Handles SQS events for validation failure processing
 */
const ValidationFailedController = require('../controllers/validation-failed-controller');
const ErrorHandler = require('../utils/error-handler');
const ResponseHelper = require('../utils/response-helper');

const controller = new ValidationFailedController();

/**
 * Lambda handler for validation failure processing
 * @param {Object} event - SQS event containing validation failure messages
 * @returns {Object} Lambda response object
 */
exports.handler = async (event) => {
  try {
    return await controller.handleSqsEvent(event);
  } catch (error) {
    console.error('Validation Failed handler error:', error);
    const errorInfo = ErrorHandler.handleError(error, { 
      operation: 'Validation Failed Handler',
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
