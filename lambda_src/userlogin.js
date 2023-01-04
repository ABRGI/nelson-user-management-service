const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { CognitoIdentityProvider, InitiateAuthCommand, AuthFlowType } = require("@aws-sdk/client-cognito-identity-provider");
const { createHmac } = require('crypto');
const https = require('https');

exports.handler = async (event) => {
    const secretsProps = {
        region: process.env.ENV_REGION
    }

    if (process.env.LOCAL) {
        secretsProps.credentials = {
            accessKeyId: process.env.ACCESSKEY,
            secretAccessKey: process.env.SECRETKEY
        };
    }

    // console.log(event);
    const { username, password } = JSON.parse(event.body);

    //Get the client secret
    const secretsClient = new SecretsManagerClient(secretsProps);
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

    //Login stage: Get AccessToken, IdToken and RefreshToken
    const cognitoProps = {
        region: process.env.ENV_REGION,
        defaultsMode: "standard",
        requestHandler: https.handler
    }
    if (process.env.LOCAL) {
        cognitoProps.credentials = {
            accessKeyId: process.env.ACCESSKEY,
            secretAccessKey: process.env.SECRETKEY
        };
    }
    const cognitoClient = new CognitoIdentityProvider(cognitoProps);

    const cognitoInitiateAuthCommand = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
            SECRET_HASH: secretHash,
        },
        ClientId: process.env.USERPOOL_CLIENT_ID
    });

    try {
        var cognitoResponse = await cognitoClient.send(cognitoInitiateAuthCommand);
        // console.log(cognitoResponse.AuthenticationResult);
        //cognitoResponse will have format specified here: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/interfaces/admininitiateauthcommandoutput.html
        //AuthentiactionResult has format specified here: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/interfaces/authenticationresulttype.html
        return {
            body: JSON.stringify({
                message: `Login succeeded`,
                token: cognitoResponse.AuthenticationResult ? cognitoResponse.AuthenticationResult.IdToken : '',
                challenge: cognitoResponse.ChallengeName,
                session: cognitoResponse.Session ?? null
            }),
            statusCode: 200
        }
    }
    catch (e) {
        console.log({
            message: `Login fail for user ${username} e.message`,
            type: e.__type
        });
        return {
            body: JSON.stringify({
                message: `Login failed: ${e.message}`
            }),
            statusCode: 401
        }
    }
}
