/*
    Function to be used for the admin to reset password to the temp password
    parameters: username - string - required
*/

const { CognitoIdentityProvider } = require("@aws-sdk/client-cognito-identity-provider");
const https = require('https');

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

exports.handler = async (event) => {
    const { username } = JSON.parse(event.body);
    try {
        const cognitoResponse = await cognitoClient.adminSetUserPassword({
            UserPoolId: process.env.USERPOOL_ID,
            Username: username,
            Password: process.env.TEMP_PASSWORD,
            Permanent: false
        });
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Password reset successfully'
            })
        };
    }
    catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message
            })
        }
    }
}