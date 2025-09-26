/**
 * CSV Processor Controller
 * Handles S3 events for CSV file processing
 */
const CsvProcessingService = require('../services/csv-processing-service');
const BaseController = require('./base-controller');

class CsvProcessorController extends BaseController {
  constructor() {
    super();
    this.csvProcessingService = new CsvProcessingService();
  }

  /**
   * Handles S3 events for CSV processing
   * @param {Object} event - S3 event containing file information
   * @returns {Object} Processing response
   */
  async handleS3Event(event) {
    try {
      const context = {
        operation: 'CSV processing',
        recordCount: event.Records?.length || 0,
        eventSource: 'S3'
      };

      return await this.handleProcessing(async () => {
        const s3Records = event.Records.filter(record => record.eventSource === 'aws:s3');
        return await this.processRecords(s3Records, (record) => 
          this.csvProcessingService.processS3Record(record)
        );
      }, context);
    } catch (error) {
      console.error('CSV Processor Controller error:', error, { event });
      const errorInfo = this.errorHandler.handleError(error, { 
        operation: 'CSV Processor Controller',
        eventSource: 'S3'
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

module.exports = CsvProcessorController;


