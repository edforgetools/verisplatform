AWS Roles

Role: VerisRegistryWriter-GitHub
ARN: arn:aws:iam::656312098174:role/VerisRegistryWriter-GitHub
Customer inline policy:
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "VisualEditor0",
			"Effect": "Allow",
			"Action": "s3:ListBucket",
			"Resource": [
				"arn:aws:s3:::veris-registry-prod",
				"arn:aws:s3:::veris-registry-staging"
			]
		},
		{
			"Sid": "VisualEditor1",
			"Effect": "Allow",
			"Action": [
				"s3:PutObject",
				"s3:GetObject"
			],
			"Resource": [
				"arn:aws:s3:::veris-registry-prod/*",
				"arn:aws:s3:::veris-registry-staging/*"
			]
		}
	]
}

Role: VerisRegistryWriter-Vercel
ARN: arn:aws:iam::656312098174:role/VerisRegistryWriter-Vercel
Customer inline policy:
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "VisualEditor0",
			"Effect": "Allow",
			"Action": "s3:ListBucket",
			"Resource": [
				"arn:aws:s3:::veris-registry-prod",
				"arn:aws:s3:::veris-registry-staging"
			]
		},
		{
			"Sid": "VisualEditor1",
			"Effect": "Allow",
			"Action": [
				"s3:PutObject",
				"s3:GetObject"
			],
			"Resource": [
				"arn:aws:s3:::veris-registry-prod/*",
				"arn:aws:s3:::veris-registry-staging/*"
			]
		}
	]
}

Role: AWSServiceRoleForResourceExplorer
ARN: arn:aws:iam::656312098174:role/aws-service-role/resource-explorer-2.amazonaws.com/AWSServiceRoleForResourceExplorer

Role: AWSServiceRoleForSupport
ARN: arn:aws:iam::656312098174:role/aws-service-role/support.amazonaws.com/AWSServiceRoleForSupport

Role: AWSServiceRoleForTrustedAdvisor
ARN: arn:aws:iam::656312098174:role/aws-service-role/trustedadvisor.amazonaws.com/AWSServiceRoleForTrustedAdvisor

AWS Buckets

Bucket: veris-registry-prod
ARN: arn:aws:s3:::veris-registry-prod

Bucket: veris-registry-staging
ARN: arn:aws:s3:::veris-registry-staging