resource "aws_iam_policy" "lambda_logs" {
  name        = "sales-csv-processor-logs-policy"
  description = "Allow Lambda to create and write CloudWatch Logs"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_s3" {
  name        = "sales-csv-processor-s3-policy"
  description = "Allow Lambda to read/write objects within the sales reports bucket"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:CopyObject"
        ],
        Resource = [
          "${aws_s3_bucket.sales_reports.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_sqs" {
  name        = "sales-etl-lambda-sqs-policy"
  description = "Allow Lambda to send and receive messages from SQS queues"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ],
        Resource = [
          aws_sqs_queue.sales_processing.arn,
          aws_sqs_queue.sales_validation_failed.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs_attach" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_logs.arn
}

resource "aws_iam_role_policy_attachment" "lambda_s3_attach" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_s3.arn
}

resource "aws_iam_role_policy_attachment" "lambda_sqs_attach" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_sqs.arn
}


