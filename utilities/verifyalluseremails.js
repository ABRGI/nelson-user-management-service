/*
    Utility to update all existing users emails to verified status.
*/
const { CognitoIdentityProvider } = require("@aws-sdk/client-cognito-identity-provider");
const https = require('https');

const cognitoClient = new CognitoIdentityProvider({
    region: process.env.ENV_REGION,
    defaultsMode: "standard",
    requestHandler: https.handler,
    credentials: {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    }
});

(async () => {
    try {
        var listProcessing = true;
        var paginationToken = null;
        var batch = 1;
        while (listProcessing) {
            console.log('Fetching batch: ', batch++);
            var cognitoResponse = await cognitoClient.listUsers({
                // AttributesToGet: ["email_verified"],
                UserPoolId: process.env.USERPOOL_ID,
                // Filter: '"email_verified"="true"',
                PaginationToken: paginationToken
            });
            // Loop through all users
            cognitoResponse.Users.forEach(async (user) => {
                var isUnverified = isEmailUnverified(user);
                console.log('Email verified status for user ', getUserAttributeValue(user, 'email').Value, ': ', !isUnverified);
                if (isUnverified) {
                    var response = await cognitoClient.adminUpdateUserAttributes({
                        UserPoolId: process.env.USERPOOL_ID,
                        Username: user.Username,
                        UserAttributes: [
                            {
                                Name: 'email_verified',
                                Value: 'true'
                            }
                        ]
                    });
                }
            });
            if (cognitoResponse.PaginationToken) {
                paginationToken = cognitoResponse.PaginationToken;
            }
            else {
                listProcessing = false;
            }
        }
    } catch (err) {
        console.log(err);
    }
})();

function getUserAttributeValue(user, attributeName) {
    return user.Attributes.find((a) => { return a.Name == attributeName });
}

function isEmailUnverified(user) {
    var emailAttribute = getUserAttributeValue(user, 'email_verified');
    return !emailAttribute || emailAttribute.Value != 'true';
}