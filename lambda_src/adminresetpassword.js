/*
    Function to be used for the admin to reset password.
    If the newpassword is not specified, the default password will be used.
    User is expected to change the password at next login
    
    parameters: 
        username - string - required
        newpassword - string - optional
        permanent - boolean - optional (defaults to false)
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
    const { username, newpassword, permanent = false } = JSON.parse(event.body);
    try {
        await cognitoClient.adminSetUserPassword({
            UserPoolId: process.env.USERPOOL_ID,
            Username: username,
            Password: newpassword || process.env.TEMP_PASSWORD,
            Permanent: permanent
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