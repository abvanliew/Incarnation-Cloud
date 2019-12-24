let AWS = require('aws-sdk');
let docClient = new AWS.DynamoDB.DocumentClient( { region: 'us-east-1' } );

exports.handler = async (event) =>
{
  let body = {};
  
  try
  {
    if( !exists( event.AccountID ) )
    {
        return sysErr( { err: "Missing Account ID", event: event } );
    }
    
    if( !exists( event.Team ) )
    {
        return sysErr( { err: "Missing Team ID", event: event } );
    }
    
    var params = {
      TableName: 'incarnation-character',
      IndexName: 'Team-Index',
      KeyConditionExpression: 'AccountID = :a and Team = :t',
      ExpressionAttributeValues: { 
        ':a': event.AccountID,
        ':t': event.Team
      },
      ProjectionExpression: ['ID', 'FullName', 'Tier', 'Exp', 'Race']
    };
    let data = await docClient.query(params).promise();
    body = data.Items;
  }
  catch( err )
  {
    return sysErr( err );
  }
  
  return {
    statusCode: 200,
    body: body,
  };
};

function sysErr( err )
{
  console.log( err );
  
  let res = {
    statusCode: 500,
    body: err,
  };
  
  return res;
}

function exists( obj )
{
  return typeof obj !== 'undefined' && obj !== null;
}