/**
 * AWS S3 Service
 * Handles all S3 operations - Single Responsibility Principle
 */
const AWS = require('aws-sdk');
const ErrorHandler = require('../utils/error-handler');

class AwsS3Service {
  constructor() {
    this.s3 = new AWS.S3();
  }

  async getObject(bucket, key) {
    try {
      const result = await this.s3.getObject({ Bucket: bucket, Key: key }).promise();
      console.log('S3 getObject operation', { bucket, key, size: result.ContentLength });
      return result;
    } catch (error) {
      console.error('S3 getObject failed', error, { bucket, key });
      throw ErrorHandler.createAwsError('S3 getObject operation failed', error, { bucket, key });
    }
  }

  async copyObject(sourceBucket, sourceKey, destinationBucket, destinationKey) {
    try {
      const result = await this.s3.copyObject({
        Bucket: destinationBucket,
        CopySource: `${sourceBucket}/${sourceKey}`,
        Key: destinationKey
      }).promise();
      console.log('S3 copyObject operation', { sourceBucket, sourceKey, destinationBucket, destinationKey });
      return result;
    } catch (error) {
      console.error('S3 copyObject failed', error, { sourceBucket, sourceKey, destinationBucket, destinationKey });
      throw ErrorHandler.createAwsError('S3 copyObject operation failed', error, { sourceBucket, sourceKey, destinationBucket, destinationKey });
    }
  }

  async deleteObject(bucket, key) {
    try {
      const result = await this.s3.deleteObject({ Bucket: bucket, Key: key }).promise();
      console.log('S3 deleteObject operation', { bucket, key });
      return result;
    } catch (error) {
      console.error('S3 deleteObject failed', error, { bucket, key });
      throw ErrorHandler.createAwsError('S3 deleteObject operation failed', error, { bucket, key });
    }
  }

  async moveFile(sourceBucket, sourceKey, destinationBucket, destinationKey) {
    try {
      await this.copyObject(sourceBucket, sourceKey, destinationBucket, destinationKey);
      await this.deleteObject(sourceBucket, sourceKey);
      console.log('File moved successfully', { 
        from: `${sourceBucket}/${sourceKey}`, 
        to: `${destinationBucket}/${destinationKey}` 
      });
    } catch (error) {
      console.error('File move failed', error, { 
        from: `${sourceBucket}/${sourceKey}`, 
        to: `${destinationBucket}/${destinationKey}` 
      });
      throw ErrorHandler.createAwsError('File move operation failed', error, { 
        from: `${sourceBucket}/${sourceKey}`, 
        to: `${destinationBucket}/${destinationKey}` 
      });
    }
  }
}

module.exports = AwsS3Service;
