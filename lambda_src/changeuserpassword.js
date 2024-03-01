/*
    Function to be used for the user to reset own password.
    User is not expected to change the password at next login
    
    parameters: 
        currentpassword - string - required
        newpassword - string - required
        accesstoken - Taken from the user session. Note that this is access token and not id token
*/

const { CognitoIdentityProvider } = require("@aws-sdk/client-cognito-identity-provider");
const https = require('https');

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
    if (!event.headers || !event.headers.Authorization) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Unauthorized'
            })
        };
    }
    const { currentpassword, newpassword, accesstoken } = JSON.parse(event.body);
    try {
        await cognitoClient.changePassword({
            PreviousPassword: currentpassword,
            ProposedPassword: newpassword,
            AccessToken: accesstoken
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
        };
    }
};