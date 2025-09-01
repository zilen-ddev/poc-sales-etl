const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Validation Failed Handler Lambda triggered:', JSON.stringify(event, null, 2));
    
    const results = {
        processed: 0,
        failed: 0,
        errors: []
    };
    
    try {
        // Process each SQS record
        for (const record of event.Records) {
            try {
                await processValidationFailure(record);
                results.processed++;
            } catch (error) {
                console.error('Error processing validation failure record:', error);
                results.failed++;
                results.errors.push({
                    messageId: record.messageId,
                    error: error.message
                });
            }
        }
        
        // Log summary
        console.log(`Validation Failed summary: processed=${results.processed}, failed=${results.failed}`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Validation failure processing completed',
                processed: results.processed,
                failed: results.failed
            })
        };
    } catch (error) {
        console.error('Error in validation failed handler:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to process validation failures',
                details: error.message
            })
        };
    }
};

async function processValidationFailure(record) {
    const message = JSON.parse(record.body);
    
    console.log(`Processing validation failure for file: ${message.sourceFile}`);
    
    // Log the validation errors for debugging
    if (message.errors) {
        console.log('Validation errors:', JSON.stringify(message.errors, null, 2));
    }
    
    if (message.error) {
        console.log('Processing error:', message.error);
    }
    
    // Here you can add business logic for handling validation failures
    // For example:
    // - Send alerts to data quality team
    // - Create tickets in issue tracking system
    // - Send notifications to stakeholders
    // - Log to external monitoring systems
    
    // Alert/notify integrations intentionally omitted per requirements
    
    // Example: Log failure details
    console.log(`Validation failure processed for ${message.sourceFile} at ${message.failedAt}`);
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
}

 
