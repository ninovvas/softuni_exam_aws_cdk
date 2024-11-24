import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {FilterCriteria, FilterRule, Runtime, StartingPosition} from "aws-cdk-lib/aws-lambda";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {AttributeType, BillingMode, StreamViewType, Table} from "aws-cdk-lib/aws-dynamodb";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ExamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for file uploads


    // S3 Bucket
    const uploadBucket = new Bucket(this, 'UploadBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });


    // DynamoDB Table for metadata
    const metadataTable = new Table(this, 'MetadataTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      timeToLiveAttribute: 'ttl', // TTL attribute for automatic expiration
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Secondary index for querying by file extension
    metadataTable.addGlobalSecondaryIndex({
      indexName: 'FileExtensionIndex',
      partitionKey: { name: 'fileExtension', type: AttributeType.STRING },
    });




  }
}
