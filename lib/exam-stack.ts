import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {Vpc, Instance, InstanceType, InstanceClass, InstanceSize, MachineImage} from 'aws-cdk-lib/aws-ec2';
import {FilterCriteria, FilterRule, Runtime, StartingPosition} from "aws-cdk-lib/aws-lambda";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {AttributeType, BillingMode, StreamViewType, Table} from "aws-cdk-lib/aws-dynamodb";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import {Subscription, SubscriptionProtocol, Topic} from "aws-cdk-lib/aws-sns";
import {DynamoEventSource} from "aws-cdk-lib/aws-lambda-event-sources";

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
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
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

    const notifyFunction  = new NodejsFunction(this, 'NotifyFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: `${__dirname}/../src/notifyFunction.ts`,
      environment: {
        TOPIC_ARN: metadataTopic.topicArn,
      }
    });

    metadataTopic.grantPublish(handleUploadFunction);
    metadataTopic.grantPublish(notifyFunction);
    metadataTable.grantReadWriteData(handleUploadFunction);
    metadataTable.grantReadWriteData(notifyFunction);



    new Subscription(this, 'MetadataSubscription', {
      topic: metadataTopic,
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: 'hristo.zhelev@yahoo.com',
    });

    notifyFunction.addEventSource(new DynamoEventSource(metadataTable, {
      startingPosition: StartingPosition.LATEST,
      batchSize: 5,
      filters: [
        FilterCriteria.filter({
          eventName: FilterRule.isEqual('REMOVE'),
        })
      ]
    }));


  }
}
