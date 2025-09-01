terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.100.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 Bucket for sales reports
resource "aws_s3_bucket" "sales_reports" {
  bucket = "daily-sales-reports-zilen"

  tags = {
    Name        = "Daily Sales Reports"
    Environment = var.environment
    Project     = "ETL Sales Pipeline"
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "sales_reports" {
  bucket = aws_s3_bucket.sales_reports.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "sales_reports" {
  bucket = aws_s3_bucket.sales_reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "sales_reports" {
  bucket = aws_s3_bucket.sales_reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "sales_reports" {
  bucket = aws_s3_bucket.sales_reports.id

  rule {
    id     = "processed_files"
    status = "Enabled"

    filter {
      prefix = "processed/"
    }

    transition {
      days          = 7
      storage_class = "GLACIER"
    }

    expiration {
      days = 30
    }
  }

  rule {
    id     = "failed_files"
    status = "Enabled"

    filter {
      prefix = "failed/"
    }

    expiration {
      days = 14
    }
  }
}

# SQS Queue for valid sales data processing
resource "aws_sqs_queue" "sales_processing" {
  name                      = "sales-processing-queue-zilen"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = var.sqs_visibility_timeout

  tags = {
    Name        = "Sales Processing Queue"
    Environment = var.environment
    Project     = "ETL Sales Pipeline"
  }
}

# SQS Queue for validation failures
resource "aws_sqs_queue" "sales_validation_failed" {
  name                      = "sales-validation-failed-queue-zilen"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = var.sqs_visibility_timeout

  tags = {
    Name        = "Sales Validation Failed Queue"
    Environment = var.environment
    Project     = "ETL Sales Pipeline"
  }
}

# Dead Letter Queue for processing failures
resource "aws_sqs_queue" "sales_processing_dlq" {
  name                      = "sales-processing-dlq-zilen"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = var.sqs_visibility_timeout

  tags = {
    Name        = "Sales Processing DLQ"
    Environment = var.environment
    Project     = "ETL Sales Pipeline"
  }
}

# Dead Letter Queue for validation failures
resource "aws_sqs_queue" "sales_validation_failed_dlq" {
  name                      = "sales-validation-failed-dlq-zilen"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = var.sqs_visibility_timeout

  tags = {
    Name        = "Sales Validation Failed DLQ"
    Environment = var.environment
    Project     = "ETL Sales Pipeline"
  }
}

# Redrive policy for processing queue
resource "aws_sqs_queue_redrive_policy" "sales_processing" {
  queue_url = aws_sqs_queue.sales_processing.id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sales_processing_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })
}

# Redrive policy for validation failed queue
resource "aws_sqs_queue_redrive_policy" "sales_validation_failed" {
  queue_url = aws_sqs_queue.sales_validation_failed.id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sales_validation_failed_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })
}

# IAM Role for Lambda function
resource "aws_iam_role" "lambda_execution_role" {
  name = "sales-csv-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "Sales CSV Processor Role"
    Environment = var.environment
    Project     = "ETL Sales Pipeline"
  }
}

# Lambda function
resource "aws_lambda_function" "csv_processor" {
  filename         = "../lambda/csv-processor.zip"
  function_name    = "sales-csv-processor"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "csv-processor.handler"
  source_code_hash = filebase64sha256("../lambda/csv-processor.zip")
  runtime         = "nodejs18.x"
  timeout         = var.lambda_timeout
  memory_size     = var.lambda_memory

  environment {
    variables = {
      PROCESSING_QUEUE_URL = aws_sqs_queue.sales_processing.id
      VALIDATION_FAILED_QUEUE_URL = aws_sqs_queue.sales_validation_failed.id
      S3_BUCKET = aws_s3_bucket.sales_reports.bucket
    }
  }

  tags = {
    Name        = "Sales CSV Processor"
    Environment = var.environment
    Project     = "ETL Sales Pipeline"
  }
}

# S3 Event Notification for Lambda
resource "aws_s3_bucket_notification" "lambda_trigger" {
  bucket = aws_s3_bucket.sales_reports.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.csv_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "incoming/"
  }

  depends_on = [aws_lambda_permission.allow_s3]
}

# Lambda permission for S3
resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.csv_processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.sales_reports.arn
}
