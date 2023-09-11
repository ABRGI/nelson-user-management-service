/*
    Responds to only the NEW_PASSWORD_REQUIRED challenge by cognito
    Expects: username, new password, session
*/
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { CognitoIdentityProvider } = require("@aws-sdk/client-cognito-identity-provider");
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { createHmac } = require('crypto');
const https = require('https');

const secretsProps = {
    region: process.env.ENV_REGION
};

if (process.env.LOCAL) {
    secretsProps.credentials = {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    };
}

const secretsClient = new SecretsManagerClient(secretsProps);

const dynamoProps = { region: process.env.ENV_REGION };
if (process.env.LOCAL) {
    dynamoProps.credentials = {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    };
}
const dynamoClient = new DynamoDB(dynamoProps);

const cognitoProps = {
    region: process.env.ENV_REGION,
    defaultsMode: "standard",
    requestHandler: https.handler
};
if (process.env.LOCAL) {
    cognitoProps.credentials = {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    };
}
const cognitoClient = new CognitoIdentityProvider(cognitoProps);

exports.handler = async (event) => {
    const { username, session, newpassword, challenegname } = JSON.parse(event.body);
    var response = {};
    //Get the client secret
    let secretResponse;
    let secret = '';
    try {
        secretResponse = await secretsClient.send(
            new GetSecretValueCommand({
                SecretId: process.env.SECRET_NAME
            })
        );
    }
    catch (error) {
        console.error('Error reading secret!');
        console.log(error);
    }
    secret = secretResponse.SecretString;
    const hasher = createHmac('sha256', secret);
    hasher.update(`${username}${process.env.USERPOOL_CLIENT_ID}`);
    const secretHash = hasher.digest('base64');

    try {
        var cognitoResponse = await cognitoClient.respondToAuthChallenge({
            ClientId: process.env.USERPOOL_CLIENT_ID,
            ChallengeName: challenegname,
            Session: session,
            ChallengeResponses: {
                SECRET_HASH: secretHash,
                USERNAME: username,
                NEW_PASSWORD: newpassword
            }
        });
        await dynamoClient.updateItem({
            TableName: process.env.USER_TABLE,
            Key: marshall({ id: JSON.parse(Buffer.from(cognitoResponse.AuthenticationResult.IdToken.split('.')[1], 'base64')).sub }),
            ExpressionAttributeNames: {
                '#confirmed': 'confirmed',
            },
            ExpressionAttributeValues: {
                ':confirmed': marshall(true),
            },
            UpdateExpression: 'SET #confirmed=:confirmed'
        });
        response = {
            message: "User password set",
            token: cognitoResponse.AuthenticationResult ? cognitoResponse.AuthenticationResult.IdToken : ''
        };
    }
    catch (err) {
        if (username) {
            console.log(`error updating password for user ${username} - ${err.message}`);
        }
        else {
            console.log(err.message);
        }
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal server error",
                error: err.message
            })
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify(response)
    };
};