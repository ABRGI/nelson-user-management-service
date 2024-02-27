/* 
    About: Function manages user login for Nelson
    Parameters:
        username - email of user if password is specified. SUB from id token if refreshtoken is specified.
        password - optional if refreshtoken is specified
        refreshtoken - optional if password is specified
        returnaccesstoken - boolean - optional - defaults to false. If set to true, the access token is returned in the response

        Note: Either password or refresh token is required along with the username
*/
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { CognitoIdentityProvider, InitiateAuthCommand, AuthFlowType } = require("@aws-sdk/client-cognito-identity-provider");
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

const dynamoProps = { region: process.env.ENV_REGION };
if (process.env.LOCAL) {
    dynamoProps.credentials = {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    };
}
const dynamoClient = new DynamoDB(dynamoProps);

exports.handler = async (event) => {
    const { username, password, refreshtoken, returnaccesstoken = false } = JSON.parse(event.body);
    var response = {};

    try {
        //Get the client secret
        let secretResponse;
        let secret = '';
        secretResponse = await secretsClient.send(
            new GetSecretValueCommand({
                SecretId: process.env.SECRET_NAME
            })
        );
        secret = secretResponse.SecretString;
        const hasher = createHmac('sha256', secret);
        hasher.update(`${username}${process.env.USERPOOL_CLIENT_ID}`);
        const secretHash = hasher.digest('base64');

        //Login stage: Get AccessToken, IdToken and RefreshToken
        if (username != null && password != null) {
            const cognitoInitiateAuthCommand = new InitiateAuthCommand({
                AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password,
                    SECRET_HASH: secretHash,
                },
                ClientId: process.env.USERPOOL_CLIENT_ID
            });

            var cognitoResponse = await cognitoClient.send(cognitoInitiateAuthCommand);
            // console.log(cognitoResponse.AuthenticationResult);
            //cognitoResponse will have format specified here: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/interfaces/admininitiateauthcommandoutput.html
            //AuthentiactionResult has format specified here: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/interfaces/authenticationresulttype.html
            response = {
                message: `Login succeeded`,
                token: cognitoResponse.AuthenticationResult ? cognitoResponse.AuthenticationResult.IdToken : '',
                accesstoken: (returnaccesstoken && cognitoResponse.AuthenticationResult) ? cognitoResponse.AuthenticationResult.AccessToken : '',
                refreshtoken: cognitoResponse.AuthenticationResult ? cognitoResponse.AuthenticationResult.RefreshToken : null,
                challenge: cognitoResponse.ChallengeName,
                session: cognitoResponse.Session ?? null
            };
            if (cognitoResponse.AuthenticationResult) {
                await dynamoClient.updateItem({
                    TableName: process.env.USER_TABLE,
                    Key: marshall({ id: JSON.parse(Buffer.from(cognitoResponse.AuthenticationResult.IdToken.split('.')[1], 'base64')).sub }),
                    ExpressionAttributeNames: {
                        '#lastlogintime': 'lastlogintime',
                    },
                    ExpressionAttributeValues: {
                        ':lastlogintime': marshall(new Date().getTime())
                    },
                    UpdateExpression: 'SET #lastlogintime=:lastlogintime'
                });
            }
        }
        else if (refreshtoken != null) {
            const cognitoInitiateAuthCommand = new InitiateAuthCommand({
                AuthFlow: AuthFlowType.REFRESH_TOKEN,
                AuthParameters: {
                    REFRESH_TOKEN: refreshtoken,
                    SECRET_HASH: secretHash,
                },
                ClientId: process.env.USERPOOL_CLIENT_ID
            });
            var cognitoResponse = await cognitoClient.send(cognitoInitiateAuthCommand);
            response = {
                message: `Login succeeded`,
                token: cognitoResponse.AuthenticationResult ? cognitoResponse.AuthenticationResult.IdToken : '',
                accesstoken: (returnaccesstoken && cognitoResponse.AuthenticationResult) ? cognitoResponse.AuthenticationResult.AccessToken : '',
                refreshtoken: cognitoResponse.AuthenticationResult && cognitoResponse.AuthenticationResult.RefreshToken ? cognitoResponse.AuthenticationResult.RefreshToken : refreshtoken,
                challenge: cognitoResponse.ChallengeName,
                session: cognitoResponse.Session ?? null
            };
        }
    }
    catch (e) {
        console.log({
            message: `Login fail for user ${username} ${e.message}`,
            type: e.__type
        });
        return {
            body: JSON.stringify({
                message: `Login failed`
            }),
            statusCode: 401
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify(response)
    };
};
