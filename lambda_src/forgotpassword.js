/*
    Function to be used for the user to self reset password. This can be done only if the user has a verified email
    parameters: username - string - required
*/

const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { CognitoIdentityProvider } = require("@aws-sdk/client-cognito-identity-provider");
const https = require('https');
const { createHmac } = require('crypto');

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

exports.handler = async (event) => {
    const { username } = JSON.parse(event.body);

    try {
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

        const cognitoResponse = await cognitoClient.forgotPassword({
            ClientId: process.env.USERPOOL_CLIENT_ID,
            SecretHash: secretHash,
            Username: username
        });
        console.log(cognitoResponse);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Password reset request submitted successfully'
            })
        };
    }
    catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message
            })
        };
    }
};