
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";


const snsClient = new SNSClient({});
const dynamoDBClient = new DynamoDBClient({});

exports.handler = async (event:any) => {

    const topicArn = process.env.TOPIC_ARN;
    for (const record of event.Records) {
        const fileKey = record.s3.object.key;
        const tableName = process.env.TABLE_NAME;
        const snsTopicArn = process.env.SNS_TOPIC_ARN;

        try {
            // Query DynamoDB for specific file metadata
            const queryCommand = new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: "fileKey = :fileKey",
                ExpressionAttributeValues: {
                    ":fileKey": { S: fileKey },
                },
            });

            const queryResponse = await dynamoDBClient.send(queryCommand);


            if (queryResponse.Items && queryResponse.Items.length > 0) {
                const fileMetadata = unmarshall(queryResponse.Items[0]);
                const { fileExtension, fileSize, timestamp } = fileMetadata;

            // Send a notification if the data are save in the database

            //Publish to SNS
            const message = `Success: The following data are save successfully to the data base:
            The file extension is ${fileExtension}, This file size is ${fileSize} and the data of upload is
            ${timestamp}`;

            const snsResponse = await snsClient.send(new PublishCommand({
                TopicArn: topicArn,
                Message: message,
            }));
                console.log("SNS notification sent:", snsResponse);
            }else {
                console.log(`No metadata found for fileKey: ${fileKey}`);
            }
        } catch (error) {
            console.error("Error processing fileKey:", fileKey, error);
        }
    }
};
