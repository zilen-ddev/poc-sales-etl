const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Sales Processor Lambda triggered:', JSON.stringify(event, null, 2));
    
    const results = {
        processed: 0,
        failed: 0,
        errors: []
    };
    
    try {
        // Process each SQS record
        for (const record of event.Records) {
            try {
                await processSalesRecord(record);
                results.processed++;
            } catch (error) {
                console.error('Error processing record:', error);
                results.failed++;
                results.errors.push({
                    messageId: record.messageId,
                    error: error.message
                });
            }
        }
        
        // Log summary
        console.log(`Sales Processor summary: processed=${results.processed}, failed=${results.failed}`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Sales processing completed',
                processed: results.processed,
                failed: results.failed
            })
        };
    } catch (error) {
        console.error('Error in sales processor:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to process sales records',
                details: error.message
            })
        };
    }
};

async function processSalesRecord(record) {
    const message = JSON.parse(record.body);
    
    console.log(`Processing sales data for file: ${message.sourceFile}`);
    
    // Here you can add business logic for processing the sales data
    // For example:
    // - Send notifications to stakeholders
    // - Generate reports
    // - Update analytics dashboards
    // - Trigger downstream processes
    
    // Example: Send notification to SNS
    if (process.env.SNS_TOPIC_ARN) {
        await sendNotification(message);
    }
    
    // Example: Log processing completion
    console.log(`Successfully processed ${message.recordCount} records from ${message.sourceFile}`);
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
}

 
