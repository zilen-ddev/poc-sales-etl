const AWS = require('aws-sdk');
const csv = require('csv-parser');
const { Readable } = require('stream');

const s3 = new AWS.S3();
const sqs = new AWS.SQS();

exports.handler = async (event) => {
  console.log('CSV Processor Lambda triggered:', JSON.stringify(event, null, 2));

  try {
    for (const record of event.Records) {
      if (record.eventSource === 'aws:s3') {
        await processS3Record(record);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'CSV processing completed',
        processedRecords: event.Records.length,
      }),
    };
  } catch (error) {
    console.error('Unhandled error processing CSV:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'CSV processing failed', details: error.message }),
    };
  }
};

async function processS3Record(record) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  console.log(`Processing file: s3://${bucket}/${key}`);

  const processingQueueUrl = process.env.PROCESSING_QUEUE_URL;
  const validationFailedQueueUrl = process.env.VALIDATION_FAILED_QUEUE_URL;

  if (!processingQueueUrl) {
    throw new Error('Missing PROCESSING_QUEUE_URL env var');
  }
  if (!validationFailedQueueUrl) {
    throw new Error('Missing VALIDATION_FAILED_QUEUE_URL env var');
  }

  try {
    const s3Object = await s3
      .getObject({ Bucket: bucket, Key: key })
      .promise();

    const rows = await parseCSV(s3Object.Body);
    if (!rows || rows.length === 0) {
      console.warn('CSV file is empty');
      await moveFileToFailed(key, bucket);
      return;
    }

    const validRows = [];
    const invalidRows = [];

    rows.forEach((row, index) => {
      const cleaned = cleanCSVRow(row);
      const errors = validateSalesRow(cleaned);
      if (errors.length === 0) {
        validRows.push({ row: cleaned, index });
      } else {
        invalidRows.push({ row: cleaned, index, errors });
      }
    });

    // Send valid rows to processing queue in batches of 10
    if (validRows.length > 0) {
      const messages = validRows.map(({ row, index }) => ({
        sourceFile: key,
        rowIndex: index,
        data: row,
        enqueuedAt: new Date().toISOString(),
      }));
      await sendBatchesToQueue(processingQueueUrl, messages);
      console.log(`Enqueued ${messages.length} valid rows to processing queue`);
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
      await sendBatchesToQueue(validationFailedQueueUrl, messages);
      console.log(`Enqueued ${messages.length} invalid rows to validation failed queue`);
    }

    // Move file per spec
    if (invalidRows.length === 0) {
      await moveFileToProcessed(key, bucket);
    } else {
      await moveFileToFailed(key, bucket);
    }

    console.log(
      `Completed file ${key}. valid=${validRows.length}, invalid=${invalidRows.length}`,
    );
  } catch (error) {
    console.error(`Error processing ${key}:`, error);
    // On unhandled processing error, move file to failed
    try {
      await moveFileToFailed(key, bucket);
    } catch (moveErr) {
      console.error('Also failed to move file to failed/:', moveErr);
    }
  }
}

function parseCSV(csvBuffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(csvBuffer.toString());

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

function cleanCSVRow(row) {
  const cleaned = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = String(key).trim();
    const cleanValue = typeof value === 'string' ? value.trim() : value;
    cleaned[cleanKey] = cleanValue;
  }
  return cleaned;
}

function validateSalesRow(row) {
  const errors = [];

  if (!row.saleId || String(row.saleId).trim() === '') {
    errors.push('saleId is required');
  }
  if (!row.productId || String(row.productId).trim() === '') {
    errors.push('productId is required');
  }

  const qty = Number(row.quantity);
  if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
    errors.push(`quantity must be a positive integer, got: ${row.quantity}`);
  }

  const amt = Number(row.amount);
  if (!Number.isFinite(amt) || amt < 0) {
    errors.push(`amount must be a non-negative number, got: ${row.amount}`);
  }

  if (row.saleDate) {
    const d = new Date(row.saleDate);
    if (Number.isNaN(d.getTime())) {
      errors.push(`saleDate must be a valid date, got: ${row.saleDate}`);
    }
  } else {
    errors.push('saleDate is required');
  }

  return errors;
}

async function sendBatchesToQueue(queueUrl, items) {
  const batches = chunkArray(items, 10);
  for (const batch of batches) {
    const entries = batch.map((item, idx) => ({
      Id: String(idx),
      MessageBody: JSON.stringify(item),
    }));
    await sqs
      .sendMessageBatch({ QueueUrl: queueUrl, Entries: entries })
      .promise();
  }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function moveFileToProcessed(sourceKey, bucket) {
  const newKey = sourceKey.replace('incoming/', 'processed/');
  await s3
    .copyObject({ Bucket: bucket, CopySource: `${bucket}/${sourceKey}`, Key: newKey })
    .promise();
  await s3.deleteObject({ Bucket: bucket, Key: sourceKey }).promise();
  console.log(`Moved file from ${sourceKey} to ${newKey}`);
}

async function moveFileToFailed(sourceKey, bucket) {
  const newKey = sourceKey.replace('incoming/', 'failed/');
  await s3
    .copyObject({ Bucket: bucket, CopySource: `${bucket}/${sourceKey}`, Key: newKey })
    .promise();
  await s3.deleteObject({ Bucket: bucket, Key: sourceKey }).promise();
  console.log(`Moved file from ${sourceKey} to ${newKey}`);
}
