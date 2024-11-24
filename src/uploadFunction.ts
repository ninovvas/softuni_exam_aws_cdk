import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {v4} from "uuid";

const snsClient = new SNSClient({});
const dynamoDBClient = new DynamoDBClient({});

export const handler = async (event: any) => {
    const tableName = process.env.TABLE_NAME;
    const topicArn = process.env.TOPIC_ARN;
    const allowedExtensions = ['pdf', 'jpg', 'png'];

    console.log(event);

    for (const record of event.Records) {
        const objectKey = record.s3.object.key;

        // Extract file extension
        const fileExtension = objectKey.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            // Notify the client of an invalid file extension
            const errorMessage = `Invalid file type: ${fileExtension} for file: ${objectKey}`;

            //Publish to SNS
            await snsClient.send(new PublishCommand({
                TopicArn: topicArn,
                Message: errorMessage,
            }));
            console.log('Notification sent!');
            continue; // Skip processing this file
        }

        // Valid file extension - proceed with storing metadata in DynamoDB
        const currentTime = Math.floor(Date.now() / 1000) // Current time in seconds
        const ttl = currentTime + 30 * 60; // 30 minutes TTL
        const fileSize = record.s3.object.size; // Get file size from the event
        const uploadTimestamp = new Date().toISOString();

        await dynamoDBClient.send(new PutItemCommand(
            {
                TableName: tableName,
                Item: {
                    id: {
                        S: v4(),
                    },
                    fileKey: {
                        S: objectKey,
                    },
                    fileExtension: {
                        S: fileExtension,
                    },
                    fileSize: {
                        S: fileSize,
                    },
                    uploadTimestamp: {
                        S: uploadTimestamp,
                    },
                    ttl: {
                        N: ttl.toString(),
                    }
                }}
        ))


        console.log(`Metadata stored for valid file: ${objectKey}`);
    }

};