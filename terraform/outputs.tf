output "s3_bucket_name" {
  description = "Name of the S3 bucket for sales reports"
  value       = aws_s3_bucket.sales_reports.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for sales reports"
  value       = aws_s3_bucket.sales_reports.arn
}

output "csv_processor_function_name" {
  description = "Name of the CSV Processor Lambda function"
  value       = aws_lambda_function.csv_processor.function_name
}

output "csv_processor_function_arn" {
  description = "ARN of the CSV Processor Lambda function"
  value       = aws_lambda_function.csv_processor.arn
}

output "sales_processor_function_name" {
  description = "Name of the Sales Processor Lambda function"
  value       = aws_lambda_function.sales_processor.function_name
}

output "sales_processor_function_arn" {
  description = "ARN of the Sales Processor Lambda function"
  value       = aws_lambda_function.sales_processor.arn
}

output "validation_failed_processor_function_name" {
  description = "Name of the Validation Failed Processor Lambda function"
  value       = aws_lambda_function.validation_failed_processor.function_name
}

output "validation_failed_processor_function_arn" {
  description = "ARN of the Validation Failed Processor Lambda function"
  value       = aws_lambda_function.validation_failed_processor.arn
}

output "processing_queue_url" {
  description = "URL of the sales processing SQS queue"
  value       = aws_sqs_queue.sales_processing.id
}

output "validation_failed_queue_url" {
  description = "URL of the validation failed SQS queue"
  value       = aws_sqs_queue.sales_validation_failed.id
}

output "processing_dlq_url" {
  description = "URL of the processing dead letter queue"
  value       = aws_sqs_queue.sales_processing_dlq.id
}

output "validation_failed_dlq_url" {
  description = "URL of the validation failed dead letter queue"
  value       = aws_sqs_queue.sales_validation_failed_dlq.id
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution_role.arn
}

 
