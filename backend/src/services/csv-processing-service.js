const AWS = require('aws-sdk');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { validateSalesRow } = require('../utils/validator');
const ErrorHandler = require('../utils/error-handler');
const Constants = require('../utils/constants');
const AwsS3Service = require('./aws-s3-service');
const AwsSqsService = require('./aws-sqs-service');
const CsvParserService = require('./csv-parser-service');
const FileManagementService = require('./file-management-service');
const ConfigurationService = require('./configuration-service');

class CsvProcessingService {
  constructor(s3Service = null, sqsService = null, csvParserService = null, fileManagementService = null, configService = null) {
    // Basic Dependency Injection - Dependency Inversion Principle
    this.s3Service = s3Service || new AwsS3Service();
    this.sqsService = sqsService || new AwsSqsService();
    this.csvParserService = csvParserService || new CsvParserService();
    this.fileManagementService = fileManagementService || new FileManagementService();
    this.configService = configService || new ConfigurationService();
  }

  async processS3Record(record) {
    const bucket = record.s3.bucket.name;
    const key = this.fileManagementService.decodeS3Key(record.s3.object.key);
    console.log(`Processing file: s3://${bucket}/${key}`, { bucket, key });

    // Validate configuration
    this.configService.validateRequiredConfig();
    const processingQueueUrl = this.configService.getProcessingQueueUrl();
    const validationFailedQueueUrl = this.configService.getValidationFailedQueueUrl();

    try {
      const s3Object = await this.s3Service.getObject(bucket, key);
      const rows = await this.csvParserService.parseCSV(s3Object.Body);
      
      if (!rows || rows.length === 0) {
        console.warn('CSV file is empty', { bucket, key });
        await this.moveFileToFailed(key, bucket);
        return;
      }

      const validRows = [];
      const invalidRows = [];

      rows.forEach((row, index) => {
        const cleaned = this.csvParserService.cleanCSVRow(row);
        const errors = validateSalesRow(cleaned);
        if (errors.length === 0) {
          validRows.push({ row: cleaned, index });
        } else {
          invalidRows.push({ row: cleaned, index, errors });
        }
      });

      // Send valid rows to processing queue in batches
      if (validRows.length > 0) {
        const messages = validRows.map(({ row, index }) => ({
          sourceFile: key,
          rowIndex: index,
          data: row,
          enqueuedAt: new Date().toISOString(),
        }));
        await this.sqsService.sendBatchesToQueue(processingQueueUrl, messages, Constants.SQS.DEFAULT_BATCH_SIZE);
        console.log(`Enqueued ${messages.length} valid rows to processing queue`, { 
          queueUrl: processingQueueUrl,
          messageCount: messages.length,
          batchSize: Constants.SQS.DEFAULT_BATCH_SIZE
        });
      }

      // For any invalid rows, send details to validation failed queue
      if (invalidRows.length > 0) {
        const messages = invalidRows.map(({ row, index, errors }) => ({
          sourceFile: key,
          rowIndex: index,
          data: row,
          errors,
          failedAt: new Date().toISOString(),
        }));
        await this.sqsService.sendBatchesToQueue(validationFailedQueueUrl, messages, Constants.SQS.DEFAULT_BATCH_SIZE);
        console.log(`Enqueued ${messages.length} invalid rows to validation failed queue`, { 
          queueUrl: validationFailedQueueUrl,
          messageCount: messages.length,
          batchSize: Constants.SQS.DEFAULT_BATCH_SIZE
        });
      }

      // Move file per spec
      if (invalidRows.length === 0) {
        await this.moveFileToProcessed(key, bucket);
      } else {
        await this.moveFileToFailed(key, bucket);
      }

      console.log(`Completed file processing`, {
        key,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        totalRows: rows.length
      });
    } catch (error) {
      console.error(`Error processing file ${key}`, error, { bucket, key });
      
      // On unhandled processing error, move file to failed
      try {
        await this.moveFileToFailed(key, bucket);
      } catch (moveErr) {
        console.error('Failed to move file to failed folder', moveErr, { bucket, key });
        throw ErrorHandler.createProcessingError(
          `Failed to process file and move to failed folder: ${moveErr.message}`,
          { originalError: error.message, moveError: moveErr.message, bucket, key }
        );
      }
      
      throw ErrorHandler.createProcessingError(
        `Failed to process file: ${error.message}`,
        { bucket, key, originalError: error.message }
      );
    }
  }


  async moveFileToProcessed(sourceKey, bucket) {
    const newKey = this.fileManagementService.getProcessedFilePath(sourceKey);
    await this.s3Service.moveFile(bucket, sourceKey, bucket, newKey);
    console.log(`Moved file from ${sourceKey} to ${newKey}`);
  }

  async moveFileToFailed(sourceKey, bucket) {
    const newKey = this.fileManagementService.getFailedFilePath(sourceKey);
    await this.s3Service.moveFile(bucket, sourceKey, bucket, newKey);
    console.log(`Moved file from ${sourceKey} to ${newKey}`);
  }
}

module.exports = CsvProcessingService;


