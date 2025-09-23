/**
 * AWS SQS Service
 * Handles all SQS operations - Single Responsibility Principle
 */
const AWS = require('aws-sdk');
const ErrorHandler = require('../utils/error-handler');
const Constants = require('../utils/constants');

class AwsSqsService {
  constructor() {
    this.sqs = new AWS.SQS();
  }

  async sendMessageBatch(queueUrl, messages) {
    try {
      const entries = messages.map((message, index) => ({
        Id: String(index),
        MessageBody: JSON.stringify(message)
      }));

      const result = await this.sqs.sendMessageBatch({
        QueueUrl: queueUrl,
        Entries: entries
      }).promise();

      console.log('SQS sendMessageBatch operation', { 
        queueUrl, 
        messageCount: messages.length,
        successful: result.Successful?.length || 0,
        failed: result.Failed?.length || 0
      });

      return result;
    } catch (error) {
      console.error('SQS sendMessageBatch failed', error, { queueUrl, messageCount: messages.length });
      throw ErrorHandler.createAwsError('SQS sendMessageBatch operation failed', error, { queueUrl, messageCount: messages.length });
    }
  }

  async sendBatchesToQueue(queueUrl, items, batchSize = Constants.SQS.DEFAULT_BATCH_SIZE) {
    try {
      // Validate batch size against AWS limits
      const validBatchSize = Math.min(batchSize, Constants.SQS.MAX_BATCH_SIZE);
      if (validBatchSize !== batchSize) {
        console.warn(`Batch size ${batchSize} exceeds AWS limit, using ${validBatchSize}`, { 
          requested: batchSize, 
          maxAllowed: Constants.SQS.MAX_BATCH_SIZE 
        });
      }

      const batches = this.chunkArray(items, validBatchSize);
      
      for (const batch of batches) {
        await this.sendMessageBatch(queueUrl, batch);
      }
    } catch (error) {
      console.error('SQS sendBatchesToQueue failed', error, { queueUrl, itemCount: items.length, batchSize });
      throw ErrorHandler.createAwsError('SQS sendBatchesToQueue operation failed', error, { queueUrl, itemCount: items.length, batchSize });
    }
  }

  chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = AwsSqsService;
