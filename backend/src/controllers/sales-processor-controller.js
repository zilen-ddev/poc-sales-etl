/**
 * Sales Processor Controller
 * Handles SQS events for sales data processing
 */
const SalesProcessingService = require('../services/sales-processing-service');
const BaseController = require('./base-controller');

class SalesProcessorController extends BaseController {
  constructor() {
    super();
    this.salesProcessingService = new SalesProcessingService();
  }

  /**
   * Handles SQS events for sales processing
   * @param {Object} event - SQS event containing sales data messages
   * @returns {Object} Processing response
   */
  async handleSqsEvent(event) {
    try {
      const context = {
        operation: 'Sales processing',
        recordCount: event.Records?.length || 0,
        eventSource: 'SQS'
      };

      return await this.handleProcessing(async () => {
        return await this.processRecords(event.Records, (record) => 
          this.salesProcessingService.processSalesRecord(record)
        );
      }, context);
    } catch (error) {
      console.error('Sales Processor Controller error:', error, { event });
      const errorInfo = this.errorHandler.handleError(error, { 
        operation: 'Sales Processor Controller',
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

module.exports = SalesProcessorController;


