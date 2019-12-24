let AWS = require('aws-sdk');
let docClient = new AWS.DynamoDB.DocumentClient( { region: 'us-east-1' } );

exports.handler = async (event) =>
{
  let data;
  let response = {
    statusCode: 200,
    body: {},
  };
  
  try
  {
    var params = {
      TableName : 'incarnation-team',
      KeyConditionExpression: 'AccountID = :a',
      ExpressionAttributeValues: { ':a': event['AccountID'] },
      ProjectionExpression: ['Team', 'TeamName', 'Wealth', 'CharacterCount', 'Leadership']
    };
    data = await docClient.query(params).promise();
    response['body'] = data['Items'];
  }
  catch( err )
  {
    console.log( err );
    response['statusCode'] = 500;
    response['body'] = err;
  }
  
  return response;
};
