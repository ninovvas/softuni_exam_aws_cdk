import * as cdk from 'aws-cdk-lib';
import * as Exam from '../lib/exam-stack';
import 'jest-cdk-snapshot';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/exam-stack.ts
test('SQS Queue Created', () => {
   const app = new cdk.App();
//     // WHEN
   const stack = new Exam.ExamStack(app, 'MyTestStack');
//     // THEN
//   const template = Template.fromStack(stack);
    expect(stack).toMatchCdkSnapshot();
//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
});
