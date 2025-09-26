/**
 * Validation Failed Controller
 * Handles SQS events for validation failure processing
 */
const ValidationFailedService = require('../services/validation-failed-service');
const BaseController = require('./base-controller');

class ValidationFailedController extends BaseController {
  constructor() {
    super();
    this.validationFailedService = new ValidationFailedService();
  }

  /**
   * Handles SQS events for validation failure processing
   * @param {Object} event - SQS event containing validation failure messages
   * @returns {Object} Processing response
   */
  async handleSqsEvent(event) {
    try {
      const context = {
        operation: 'Validation failure processing',
        recordCount: event.Records?.length || 0,
        eventSource: 'SQS'
      };

      return await this.handleProcessing(async () => {
        return await this.processRecords(event.Records, (record) => 
          this.validationFailedService.processValidationFailure(record)
        );
      }, context);
    } catch (error) {
      console.error('Validation Failed Controller error:', error, { event });
      const errorInfo = this.errorHandler.handleError(error, { 
        operation: 'Validation Failed Controller',
        eventSource: 'SQS'
      });
      return this.responseHelper.error(
        errorInfo.message,
        errorInfo.statusCode,
        {},
        errorInfo.context
      );
    }
  }
}

module.exports = ValidationFailedController;


