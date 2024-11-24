import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {Vpc, Instance, InstanceType, InstanceClass, InstanceSize, MachineImage} from 'aws-cdk-lib/aws-ec2';
import {FilterCriteria, FilterRule, Runtime, StartingPosition} from "aws-cdk-lib/aws-lambda";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {AttributeType, BillingMode, StreamViewType, Table} from "aws-cdk-lib/aws-dynamodb";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import {Subscription, SubscriptionProtocol, Topic} from "aws-cdk-lib/aws-sns";

export class ExamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for EC2
    const vpc = new Vpc(this, 'WebInterfaceVPC', {
      maxAzs: 2,
    });

    // EC2 Instance for web interface
    const ec2Instance = new Instance(this, 'WebInterfaceInstance', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux(),
      keyName: 'ssh-exam-key',
    });


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

    const metadataTopic = new Topic(this, 'ErrorTopic', {
      topicName: 'MetadataTopic'
    });

    const handleUploadFunction  = new NodejsFunction(this, 'HandleUploadFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: `${__dirname}/../src/uploadFunction.ts`,
      environment: {
        TABLE_NAME: metadataTable.tableName,
        BUCKET_NAME: uploadBucket.bucketName,
        TOPIC_ARN: metadataTopic.topicArn,
      }
    });

    metadataTopic.grantPublish(handleUploadFunction);
    metadataTable.grantReadWriteData(handleUploadFunction);



    new Subscription(this, 'MetadataSubscription', {
      topic: metadataTopic,
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: 'ninov_16@yahoo.com', //hristo.zhelev@yahoo.com
    });







  }
}
