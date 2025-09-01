# Lambda for Sales ETL Pipeline

This directory contains the Lambda code for the Sales ETL Pipeline.

## Function Overview

### CSV Processor (single package)
Purpose: Process CSV files uploaded to S3 and validate each row.

Trigger: S3 ObjectCreated events for keys under `incoming/`.

Functionality:
- Download and parse CSV from S3
- Per-row validation (`saleId`, `productId`, `quantity`, `amount`, `saleDate`)
- Send valid rows to `sales-processing-queue-zilen`
- Send invalid rows to `sales-validation-failed-queue-zilen`
- Move file to `processed/` if all rows valid; otherwise to `failed/`

Environment Variables:
- `PROCESSING_QUEUE_URL`: URL of processing SQS queue
- `VALIDATION_FAILED_QUEUE_URL`: URL of validation failed SQS queue
- `S3_BUCKET`: S3 bucket name (e.g., `daily-sales-reports-zilen`)

Files:
- `csv-processor.js` (handler)
- `utils/validator.js` (helpers)

## Packaging

From the `lambda/` directory:

```bash
npm ci --omit=dev
zip -r csv-processor.zip csv-processor.js utils node_modules package.json package-lock.json \
  -x "*.zip" "node_modules/.cache/*" "*.log"
```

Terraform references `../lambda/csv-processor.zip` for deployment.

## Architecture Flow

```
S3 (incoming/) → Lambda (CSV Processor)
                     ├─ valid rows → SQS: sales-processing-queue-zilen
                     └─ invalid rows → SQS: sales-validation-failed-queue-zilen

File outcome: processed/ (all valid) or failed/ (any invalid)
```

## Monitoring & Error Handling

- Logs: CloudWatch Logs for `sales-csv-processor`
- DLQs: Each SQS queue has a DLQ for failed message processing
- S3 Lifecycle: processed/ to Glacier after 7 days; delete after 30 days; failed/ delete after 14 days

## Redrive (from DLQ)

Console:
- SQS → select DLQ (e.g., `sales-processing-dlq-zilen`) → Start redrive → choose source queue.

CLI example:
```bash
aws sqs receive-message --queue-url <dlq-url> --max-number-of-messages 10
aws sqs send-message --queue-url <source-queue-url> --message-body '<JSON>'
```
