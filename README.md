# Sales ETL Pipeline

A serverless data ingestion pipeline for processing daily sales reports in CSV format using AWS services.

## Architecture Overview

```
S3 (incoming/) → Lambda (CSV Processor)
                    ├─ valid rows → SQS: sales-processing-queue-zilen
                    └─ invalid rows → SQS: sales-validation-failed-queue-zilen

File outcome: processed/ (all valid) or failed/ (any invalid)
```

### Components

- **S3 Bucket**: Stores incoming CSV files, processed files, and failed files
- **Lambda Function**: Processes CSV files and validates sales data
- **SQS Queues**: Handle valid data processing and validation failures
- **Dead Letter Queues (DLQ)**: Capture failed messages for reprocessing
- **CloudWatch Logs**: Monitor Lambda execution

## Features

- ✅ **Automated CSV Processing**: Triggers on S3 file uploads
- ✅ **Data Validation**: Comprehensive validation of sales data fields
- ✅ **Error Handling**: Separate queues for different failure types
- ✅ **File Management**: Automatic file movement based on processing results
- ✅ **Lifecycle Management**: S3 lifecycle rules for cost optimization
- ✅ **Monitoring**: CloudWatch integration for observability
- ✅ **Scalability**: Serverless architecture that scales automatically

## Infrastructure Components

### S3 Bucket Structure
```
daily-sales-reports-zilen/
├── incoming/     # New CSV files (triggers Lambda)
├── processed/    # Successfully processed files
└── failed/       # Files with validation errors
```

### SQS Queues
- **sales-processing-queue**: Valid sales data for processing
- **sales-validation-failed-queue**: Rows that failed validation
- **sales-processing-dlq**: Dead letter queue for processing failures
- **sales-validation-failed-dlq**: Dead letter queue for validation failures

### Lifecycle Rules
- **Processed files**: Move to Glacier after 7 days, delete after 30 days
- **Failed files**: Delete after 14 days

## Data Validation

The pipeline validates the following fields in each CSV row:

### Required Fields
- `saleId`: Alphanumeric, 3-20 characters
- `productId`: Alphanumeric, 3-15 characters
- `quantity`: Positive integer
- `amount`: Positive number with up to 2 decimal places
- `saleDate`: YYYY-MM-DD format, not in the future

### Optional Fields
- `customerId`: Alphanumeric, 3-15 characters
- `region`: One of: North, South, East, West, Central
- `category`: One of: Electronics, Clothing, Home, Sports, Books

## Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Terraform installed (version >= 1.0)
- Node.js 18+ for Lambda function

### Steps

1. Package Lambda (from `lambda/`):
   ```bash
   npm ci --omit=dev
   zip -r csv-processor.zip csv-processor.js utils node_modules package.json package-lock.json \
     -x "*.zip" "node_modules/.cache/*" "*.log"
   ```

2. Deploy infrastructure:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

### Configuration

Modify `terraform/variables.tf` to customize:
- AWS region
- Lambda timeout and memory
- SQS visibility timeout
- Retry counts

## Usage

### Uploading CSV Files

1. Upload CSV files to the `incoming/` folder in your S3 bucket
2. The Lambda function automatically processes the file
3. Check CloudWatch logs for processing results

### CSV Format Example

```csv
saleId,productId,quantity,amount,saleDate,customerId,region,category
S001,P001,2,29.99,2024-01-15,C001,North,Electronics
S002,P002,1,15.50,2024-01-15,C002,South,Clothing
```

### Monitoring

- **CloudWatch Logs**: `/aws/lambda/sales-csv-processor`
- **SQS Metrics**: Monitor queue depths and processing times
- **S3 Lifecycle**: Verify transitions and expirations

## SQS Redrive Process

### Manual Redrive from DLQ

1. **Using AWS Console:**
   - Navigate to SQS service
   - Select the DLQ (e.g., `sales-processing-dlq`)
   - Select messages to redrive
   - Click "Start Message Redrive"
   - Choose the source queue (e.g., `sales-processing-queue`)

2. **Using AWS CLI:**
   ```bash
   # Get messages from DLQ
   aws sqs receive-message --queue-url <dlq-url> --max-number-of-messages 10
   
   # Send message back to source queue
   aws sqs send-message --queue-url <source-queue-url> --message-body <message-body>
   ```

3. **Using Lambda Function:**
   - Create a redrive Lambda function using the provided IAM role
   - Process messages from DLQ and send them back to source queue

### Automated Redrive

Consider implementing a scheduled Lambda function that:
- Monitors DLQ depths
- Automatically redrives messages after a delay
- Implements exponential backoff for retries

## Troubleshooting

### Common Issues

1. **Lambda Timeout**
   - Increase timeout in `variables.tf`
   - Check for large CSV files (>100MB)

2. **SQS Message Processing Failures**
   - Review CloudWatch logs for validation errors
   - Check DLQ for failed messages
   - Verify CSV format and data quality

3. **S3 Permission Errors**
   - Ensure Lambda has proper S3 permissions
   - Check bucket policy and IAM roles

4. **File Not Moving**
   - Verify Lambda has S3 copy/delete permissions
   - Check CloudWatch logs for move operation errors

### Debug Mode

Enable detailed logging by setting environment variables:
```bash
export AWS_SDK_JS_DEBUG=1
export LAMBDA_LOG_LEVEL=DEBUG
```

## Cost Optimization

- **S3 Lifecycle Rules**: Automatically move processed files to Glacier
- **Lambda Configuration**: Optimize memory and timeout settings
- **SQS Visibility Timeout**: Balance between reliability and cost
- **CloudWatch Log Retention**: Set appropriate log retention periods

## Security

- **IAM Roles**: Least privilege access for Lambda function
- **S3 Bucket Policies**: Restrict access to authorized users
- **SQS Encryption**: Enable server-side encryption for sensitive data
- **VPC Configuration**: Consider placing Lambda in VPC for additional security

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check CloudWatch logs for error details
- Review Terraform plan for configuration issues
- Consult AWS documentation for service-specific problems
