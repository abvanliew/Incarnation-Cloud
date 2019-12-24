var AWS = require('aws-sdk');
var docClient = new AWS.DynamoDB.DocumentClient( { region: 'us-east-1' } );
var reName = RegExp( "^[A-Za-z]([-A-Za-z0-9' ]{1,30})[A-Za-z0-9]$" );

exports.handler = async (event) =>
{
  let body = {};
  
  try
  {
    if( !event.AccountID )
    {
      return sysErr( { err: "Missing Account ID", event: event } );
    }
    
    if( !validName( event.TeamName ) )
    {
      return sysErr( "Team name is invalid" );
    }
    
    let curTeamParams = {
      TableName: 'incarnation-team',
      KeyConditionExpression: 'AccountID = :a',
      ExpressionAttributeValues: { ':a': event.AccountID },
      ProjectionExpression: ['Team'],
      ScanIndexForward: false
    };
    
    let curTeam = await docClient.query(curTeamParams).promise();
    let newTeamID = curTeam.Count == 0 ? 0 : curTeam.Items[0].Team + 1;
    
    let curCharactersParams = {
      TableName: 'incarnation-character',
      IndexName: 'Team-Index',
      KeyConditionExpression: 'AccountID = :a and Team = :t',
      ExpressionAttributeValues: { 
        ':a': event.AccountID,
        ':t': newTeamID
      },
      ProjectionExpression: [ 'ID' ]
    }
    let curCharacters = await docClient.query( curCharactersParams ).promise();
    
    if( curCharacters.Count > 0 )
    {   
      let characterCleanup = [];
      
      for( let i = 0; i < curCharacters.Count; i++ )
      {
        characterCleanup.push( { 
          DeleteRequest: { Key: { 
            AccountID: event.AccountID,
            ID: curCharacters.Items[i].ID
          } }
        } );
      }
      
      let batchCleanupParms = {
        RequestItems: { 'incarnation-character': characterCleanup }
      };
      
      await docClient.batchWrite( batchCleanupParms ).promise();
    }
    
    let newTeamParams = {
      TableName : 'incarnation-team',
      Item: {
        AccountID: event.AccountID,
        Team: newTeamID,
        TeamName: event.TeamName,
        Wealth: 100,
        Leadership: .1,
        CharacterCount: 1
      }
    };
    await docClient.put( newTeamParams ).promise();
    
    body.Team = newTeamID;
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

function sysErr( err ) {
  console.log( err );
  
  let res = {
    statusCode: 500,
    body: err,
  };
  
  return res;
}

function validName( name ) {
  return reName.test( name );
}