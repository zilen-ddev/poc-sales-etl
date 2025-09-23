# Sales ETL Pipeline Backend

This directory contains the backend Lambda functions for the Sales ETL Pipeline, built with a clean architecture following SOLID principles.

## Architecture Overview

The backend is organized into a layered architecture with clear separation of concerns:

```
src/
├── handlers/          # Lambda entry points
├── controllers/       # Business logic orchestration
├── services/         # Core business services
└── utils/            # Shared utilities and helpers
```

## Lambda Functions

### 1. CSV Processor Lambda
**Purpose**: Process CSV files uploaded to S3 and validate each row.

**Trigger**: S3 ObjectCreated events for keys under `incoming/`.

**Functionality**:
- Download and parse CSV from S3
- Per-row validation using `SalesRecord` model (`saleId`, `productId`, `quantity`, `amount`, `saleDate`)
- Send valid rows to processing queue in batches
- Send invalid rows to validation failed queue
- Move file to `processed/` if all rows valid; otherwise to `failed/`

**Files**:
- `handlers/csv-processor.js` - Lambda entry point
- `controllers/csv-processor-controller.js` - Business logic orchestration
- `services/csv-processing-service.js` - Core CSV processing logic
- `services/csv-parser-service.js` - CSV parsing utilities
- `services/aws-s3-service.js` - S3 operations
- `services/aws-sqs-service.js` - SQS operations
- `services/file-management-service.js` - File path management
- `services/configuration-service.js` - Environment configuration
- `utils/sales-record.js` - Sales data model with validation
- `utils/validator.js` - Validation utilities
- `utils/error-handler.js` - Centralized error handling
- `utils/response-helper.js` - Response formatting
- `utils/constants.js` - Application constants

### 2. Sales Processor Lambda
**Purpose**: Process validated sales records from the processing queue.

**Trigger**: SQS messages from `sales-processing-queue-zilen`.

**Functionality**:
- Process individual sales records
- Execute business logic for sales data
- Log processing completion

**Files**:
- `handlers/sales-processor.js` - Lambda entry point
- `controllers/sales-processor-controller.js` - Business logic orchestration
- `services/sales-processing-service.js` - Core sales processing logic

### 3. Validation Failed Lambda
**Purpose**: Handle validation failures and log error details.

**Trigger**: SQS messages from `sales-validation-failed-queue-zilen`.

**Functionality**:
- Process validation failure records
- Log detailed error information
- Handle failed data for debugging

**Files**:
- `handlers/validation-failed-handler.js` - Lambda entry point
- `controllers/validation-failed-controller.js` - Business logic orchestration
- `services/validation-failed-service.js` - Core validation failure processing

## Environment Variables

- `PROCESSING_QUEUE_URL`: URL of processing SQS queue
- `VALIDATION_FAILED_QUEUE_URL`: URL of validation failed SQS queue
- `SNS_TOPIC_ARN`: SNS topic for notifications (optional)
- `LOG_LEVEL`: Logging level (default: INFO)
- `NODE_ENV`: Environment (development/production)

## Architecture Flow

```
S3 (incoming/) → CSV Processor Lambda
                     ├─ valid rows → SQS: sales-processing-queue-zilen → Sales Processor Lambda
                     └─ invalid rows → SQS: sales-validation-failed-queue-zilen → Validation Failed Lambda

File outcome: processed/ (all valid) or failed/ (any invalid)
```

## Key Features

### Error Handling
- Comprehensive try-catch blocks throughout the application
- Centralized error handling with `ErrorHandler` utility
- Proper error logging with context information
- Graceful degradation and meaningful error messages

### Code Quality
- Complete JSDoc documentation for all classes and methods
- SOLID principles implementation
- Dependency injection for testability
- Clean separation of concerns
- No unused code or functions

### Configuration Management
- Centralized constants in `utils/constants.js`
- Environment-based configuration
- Easy batch size and limit adjustments

### Validation
- Robust sales record validation using `SalesRecord` model
- Type checking and format validation
- Comprehensive error reporting

## Deployment

The Terraform configuration automatically handles packaging and deployment:

1. **Automatic Packaging**: Terraform uses the `archive_file` data source to automatically create a zip file from the backend source code
2. **No Manual Steps**: No need to manually create zip files or run packaging commands
3. **Automatic Updates**: When source code changes, Terraform automatically detects changes and updates the Lambda functions

### Lambda Function Handlers

Each Lambda function uses a different handler from the same codebase:

- **CSV Processor**: `src/handlers/csv-processor.handler`
- **Sales Processor**: `src/handlers/sales-processor.handler`  
- **Validation Failed**: `src/handlers/validation-failed-handler.handler`

### Development Setup

For local development, ensure dependencies are installed:

```bash
cd backend
npm install
```

## Monitoring & Error Handling

- **Logs**: CloudWatch Logs for each Lambda function
- **Error Tracking**: Centralized error handling with detailed context
- **DLQs**: Each SQS queue has a DLQ for failed message processing
- **S3 Lifecycle**: processed/ to Glacier after 7 days; delete after 30 days; failed/ delete after 14 days

## Development

### Code Structure
- **Handlers**: Lambda entry points with error handling
- **Controllers**: Business logic orchestration and request handling
- **Services**: Core business logic and external service integration
- **Utils**: Shared utilities, models, and helpers

### Testing
- Each service can be unit tested independently
- Dependency injection enables easy mocking
- Error scenarios are properly handled and logged

## Redrive (from DLQ)

Console:
- SQS → select DLQ (e.g., `sales-processing-dlq-zilen`) → Start redrive → choose source queue.

CLI example:
```bash
aws sqs receive-message --queue-url <dlq-url> --max-number-of-messages 10
aws sqs send-message --queue-url <source-queue-url> --message-body '<JSON>'
```
