/*
    When the user has used the forgot password link and receives a confirmation code, user can submit the code along with new password to reset their password
    parameters: 
        username - string - required - user email used to login
        code - numeric - required
        newpassword - string - required
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
    const { username, confirmationcode, newpassword } = JSON.parse(event.body);

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

        const cognitoResponse = await cognitoClient.confirmForgotPassword({
            ClientId: process.env.USERPOOL_CLIENT_ID,
            SecretHash: secretHash,
            Username: username,
            ConfirmationCode: confirmationcode,
            Password: newpassword
        });
        console.log(cognitoResponse);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Password updated successfully'
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