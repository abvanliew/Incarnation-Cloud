var AWS = require('aws-sdk');
var docClient = new AWS.DynamoDB.DocumentClient( { region: 'us-east-1' } );
var lambda = new AWS.Lambda( { apiVersion: '2015-03-31', region: 'us-east-1' } );
const maxDistribution = process.env.maxDistribution;

exports.handler = async (event) =>
{
  let body = {};
  
  try
  {
    if( !exists( event.AccountID ) )
    {
      return sysErr( "Missing Account ID" );
    }
    
    if( !exists( event.TeamID ) )
    {
      return sysErr( "Missing Team ID" );
    }
    
    var teamCheckParams = {
      TableName: 'incarnation-team',
      KeyConditionExpression: 'AccountID = :a and Team = :t',
      ExpressionAttributeValues: { 
        ':a': event.AccountID,
        ':t': event.TeamID
      },
      ProjectionExpression: [ 'Team' ]
    }
    let teamCheck = await docClient.query( teamCheckParams ).promise();
    
    if( teamCheck.Count == 0 )
    {
      return sysErr( "No team with that ID" );
    }
    
    var charCheckParams = {
      TableName: 'incarnation-character',
      IndexName: 'Team-Index',
      KeyConditionExpression: 'AccountID = :a',
      ExpressionAttributeValues: { 
        ':a': event.AccountID
      },
      ProjectionExpression: ['ID' ]
    };
    let charCheck = await docClient.query( charCheckParams ).promise();
    
    if( charCheck.Count > 0 )
    {
      return sysErr( "Team already has characters" );
    }
    
    if( !validName( event.FullName ) )
    {
      return sysErr( "Character name is invalid" );
    }
    
    if( !validStartingRace( event.RaceID ) )
    {
      return sysErr( "Invalid starting race" );
    }
    
    let { valid: attribDistValid, validDist: attribDist } = validateDistribution( event.AttributeDistribution );
    
    if( !attribDistValid )
    {
      return sysErr( "Invalid attribute distribution" );
    }
    
    // let curTeamParams = {
    //     TableName: 'incarnation-team',
    //     KeyConditionExpression: 'AccountID = :a',
    //     ExpressionAttributeValues: { ':a': event.AccountID },
    //     ProjectionExpression: ['Team'],
    //     ScanIndexForward: false
    // };
    
    // let curTeam = await docClient.query(curTeamParams).promise();
    // let newTeamID = curTeam.Count == 0 ? 0 : curTeam.Items[0].Team + 1;
    
    let curCharacterParams = {
      TableName: 'incarnation-character',
      KeyConditionExpression: 'AccountID = :a',
      ExpressionAttributeValues: { ':a': event.AccountID },
      ProjectionExpression: ['ID'],
      ScanIndexForward: false
    };
    
    let curCharacter = await docClient.query( curCharacterParams ).promise();
    let newCharacterID = curCharacter.Count == 0 ? 0 : curCharacter.Items[0].ID + 1;
    
    let newCharacterParams = {
      TableName: 'incarnation-character',
      Item: {
        AccountID: event.AccountID,
        ID: newCharacterID,
        Team: event.TeamID,
        FullName: event.NewCharacter.FullName,
        Tier: 5,
        Exp: 400,
        Race: event.NewCharacter.RaceID,
        Classes: docClient.createSet( [ 1 ] ),
        Attributes: [],
        Skills: [],
        Perks: {},
        Traits: docClient.createSet( [ 1 ] )
      }
    };
    
    for( let i = 0; i < attribDist.length; i++ )
    {
      newCharacterParams.Item.Attributes.push(
        {
          CurrentDistribution: attribDist[i],
          IdealDistribution: attribDist[i]
        }
      );
    }
    
    console.log( newCharacterParams );
    
    await docClient.put( newCharacterParams ).promise();
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

function exists( obj )
{
  return typeof obj !== 'undefined' && obj !== null;
}

function validName( name ) {
  let re = RegExp( "^[A-Za-z]([-A-Za-z0-9' ]{1,30})[A-Za-z0-9]$" );
  return re.test( name );
}

function validStartingRace( race ) {
  return Number.isInteger( race ) && race >= 0 && race <= 6
}

function validateDistribution( testDist ) {
  let valid = false;
  let validDist = [];
  
  for( let i = 0; i < testDist.length; i++ )
  {
    validDist.push( testDist[i] < 0 ? 0 : testDist[i] > maxDistribution ? maxDistribution : testDist[i] );
    
    if( validDist[i] > 0 )
    {
      valid = true;
    }
  }
  
  return { valid: valid, validDist: validDist };
}