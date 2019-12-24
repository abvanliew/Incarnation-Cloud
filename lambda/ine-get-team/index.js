var AWS = require('aws-sdk');
var docClient = new AWS.DynamoDB.DocumentClient( { region: 'us-east-1' } );
var reName = RegExp( "^[A-Za-z]([-A-Za-z0-9' ]{1,30})[A-Za-z0-9]$" );

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
    
    let teamParams = {
      TableName: 'incarnation-team',
      Key: {
        AccountID: event.AccountID,
        Team: event.Team
      },
      AttributesToGet: [ 'Team', 'TeamName', 'Wealth', 'Leadership' ]
    };
    
    let team = await docClient.get( teamParams ).promise();
    
    body = team.Item;
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