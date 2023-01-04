/*
    Creates a new user or updates the user attributes for the user in cognito or the used DB.
    Parameters:
    required - username: string or email
    required - email: email of the user
    optional - resendcredentials: Required if user was already created but not confirmed to resend the user password
    optional - role: UID of the role - will be added to the user
    optional - rights: []UID of rights - will be appended to the user
*/
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { CognitoIdentityProvider, MessageActionType, DeliveryMediumType } = require("@aws-sdk/client-cognito-identity-provider");
const https = require('https');

exports.handler = async (event) => {
    const { username, email, resendcredentials, role, rights } = JSON.parse(event.body);
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

    //Step 1: Search for user in cognito
    var existinguser = false;
    var user = null;
    try {
        user = await cognitoClient.adminGetUser({
            UserPoolId: process.env.USERPOOL_ID,
            Username: username
        });
        existinguser = true;
    } catch (err) {
        console.log(err.message);
        if (err.__type == 'UserNotFoundException') {
            existinguser = false;
        }
        else {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: "Internal server error",
                    error: err.message
                })
            }
        }
    }
    if (!existinguser || resendcredentials) {
        //Step 2: Create the new user
        try {
            console.log(`Creating user ${username}`);
            var newuserresult = await cognitoClient.adminCreateUser({
                UserPoolId: process.env.USERPOOL_ID,
                Username: username,
                TemporaryPassword: process.env.TEMP_PASSWORD,   //If undefined, Cognito will generate a custom password
                MessageAction: resendcredentials ? MessageActionType.RESEND : undefined,
                DesiredDeliveryMediums: [DeliveryMediumType.EMAIL],
                ForceAliasCreation: true
            });
            user = newuserresult.User;
            // console.log(newuserresult);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: existinguser ? 'Resent user creds' : 'Creating new user',
                    user: newuserresult.User
                })
            };
        }
        catch (err) {
            console.log(err.message);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: err.message
                })
            }
        }
    }
    else if (email && email != '' && email != getUserEmail(user.UserAttributes)) {
        try {
            //Existing user - update email in congnito
            console.log(`Updating existing user parameters`);
            // console.log(user);
            cognitoResponse = await cognitoClient.adminUpdateUserAttributes({
                UserPoolId: process.env.USERPOOL_ID,
                Username: username,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email
                    }
                ]
            });
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Updating existing user',
                    user: {
                        enabled: user.Enabled,
                        userattributes: user.UserAttributes,
                        userstatus: user.UserStatus,
                        userid: user.Username
                    }
                })
            };
        }
        catch (err) {
            console.log(err.message);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: err.message
                })
            }
        }
    }
    if (role != null) {
        //Update Dynamo with the user roles and rights
        const dynamoProps = { region: process.env.region }
        if (process.env.LOCAL) {
            dynamoProps.credentials = {
                accessKeyId: process.env.ACCESSKEY,
                secretAccessKey: process.env.SECRETKEY
            };
        }
        var dynamoclient = new DynamoDB(dynamoProps);
        const roleParams = {
            TableName: process.env.ROLES_TABLE,
            Item: marshall({})
        };
        try {
            var data = await dynamoclient.putItem(roleParams);
            console.log(data);
        }
        catch (e) {
            console.log(e);
        }
    }
    if (rights != null) {
        //TODO: Add rights to the user
    }
}

function getUserEmail(userAttributes) {
    return emailAttribute = userAttributes.find((attr) => { return attr.Name == 'email' })?.Value || null;
}