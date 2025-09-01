const AWS = require('aws-sdk');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { validateCSVData } = require('./utils/validator');

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('CSV Processor Lambda triggered:', JSON.stringify(event, null, 2));
    
    try {
        // Process each S3 record
        for (const record of event.Records) {
            if (record.eventSource === 'aws:s3') {
                await processS3Record(record);
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'CSV processing completed successfully',
                processedRecords: event.Records.length
            })
        };
    } catch (error) {
        console.error('Error processing CSV:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to process CSV',
                details: error.message
            })
        };
    }
};

async function processS3Record(record) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing file: s3://${bucket}/${key}`);
    
    try {
        // Get the CSV file from S3
        const s3Object = await s3.getObject({
            Bucket: bucket,
            Key: key
        }).promise();
        
        // Parse CSV data
        const csvData = await parseCSV(s3Object.Body);
        
        // Validate data
        const validationResult = validateCSVData(csvData);
        if (!validationResult.isValid) {
            throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
        }
        
        // Transform and save to DynamoDB
        await saveToDynamoDB(csvData, key);
        
        console.log(`Successfully processed ${csvData.length} records from ${key}`);
        
    } catch (error) {
        console.error(`Error processing ${key}:`, error);
        throw error;
    }
}

function parseCSV(csvBuffer) {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(csvBuffer.toString());
        
        stream
            .pipe(csv())
            .on('data', (data) => {
                // Clean and transform data
                const cleanedData = cleanCSVRow(data);
                results.push(cleanedData);
            })
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

function cleanCSVRow(row) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(row)) {
        // Remove extra whitespace
        const cleanKey = key.trim();
        const cleanValue = typeof value === 'string' ? value.trim() : value;
        
        // Convert numeric strings to numbers
        if (!isNaN(cleanValue) && cleanValue !== '') {
            cleaned[cleanKey] = parseFloat(cleanValue);
        } else {
            cleaned[cleanKey] = cleanValue;
        }
    }
    
    return cleaned;
}

async function saveToDynamoDB(data, sourceFile) {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    
    if (!tableName) {
        throw new Error('DYNAMODB_TABLE_NAME environment variable not set');
    }
    
    const batchSize = 25; // DynamoDB batch write limit
    
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const putRequests = batch.map(item => ({
            PutRequest: {
                Item: {
                    ...item,
                    id: generateId(),
                    sourceFile: sourceFile,
                    processedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                }
            }
        }));
        
        const params = {
            RequestItems: {
                [tableName]: putRequests
            }
        };
        
        try {
            await dynamodb.batchWrite(params).promise();
            console.log(`Saved batch of ${putRequests.length} items to DynamoDB`);
        } catch (error) {
            console.error('Error saving to DynamoDB:', error);
            throw error;
        }
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
