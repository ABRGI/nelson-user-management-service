/**
    Creates a new user or updates the user attributes for the user in cognito or the used DB.
        The function creates a new user in Cognito if user doesn't exist
        If the user exists and email is provided, then the funciton updates the user email in Cognito
        If roles or rights are specified, the function updates the roles to the user that exists in the system
    Parameters:
    required - username: string or email
    required - email: string email of the user
    required - fullname: string full name of the user
    optional - resendcredentials: Required if user was already created but not confirmed to resend the user password
    optional - roles: Comma separated UID of the roles - will be added to the user. If not specified, role will be removed
    optional - rights: Comma separated UIDs of rights - will be appended to the user. If not specified, rights will be removed
    optional - tenantids: Comma separated UIDs of tenants - will be appended to the user. If not specified, rights will be removed
    optional - disabled: boolean indicating if the user is disabled. Default false
*/
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { CognitoIdentityProvider, MessageActionType, DeliveryMediumType } = require("@aws-sdk/client-cognito-identity-provider");
const https = require('https');

//Keep the connections to clients outside the handler to allow for reuse of existing connections.
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

const dynamoProps = { region: process.env.ENV_REGION }
if (process.env.LOCAL) {
    dynamoProps.credentials = {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    };
}
const dynamoClient = new DynamoDB(dynamoProps);

exports.handler = async (event) => {
    const { username, email, fullname, resendcredentials, roles, rights, tenantids, disabled = false } = JSON.parse(event.body);
    var response = {};
    // Search for user in cognito
    var existingUser = false;
    var user = null;
    try {
        user = await cognitoClient.adminGetUser({
            UserPoolId: process.env.USERPOOL_ID,
            Username: username
        });
        response.message = 'Updating existing user';
        response.user = {
            enabled: user.Enabled,
            userattributes: user.UserAttributes,
            userstatus: user.UserStatus,
            userid: user.Username
        };
        existingUser = true;
    } catch (err) {
        if (err.__type == 'UserNotFoundException') {
            user = null;
            existingUser = false;
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
    if (!existingUser || resendcredentials) {
        // Create the new user
        try {
            var newUserResult = await cognitoClient.adminCreateUser({
                UserPoolId: process.env.USERPOOL_ID,
                Username: username,
                TemporaryPassword: process.env.TEMP_PASSWORD,   //If undefined, Cognito will generate a custom password
                MessageAction: resendcredentials ? MessageActionType.RESEND : undefined,
                DesiredDeliveryMediums: [DeliveryMediumType.EMAIL],
                ForceAliasCreation: true,
                UserAttributes: {
                    'name': fullname
                }
            });
            user = newUserResult.User;
            response.message = existingUser ? 'Resent user creds' : 'Creating new user';
            response.user = newUserResult.User;
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
    //Update cognito properties
    if (existingUser) {
        var updateAttributes = [];
        if (email && email != '' && email != getAttributeValue(user.UserAttributes, 'email')) {
            updateAttributes.push({
                Name: 'email',
                Value: email
            });
        }
        if (fullname && fullname != '' && fullname != getAttributeValue(user.UserAttributes, 'name')) {
            updateAttributes.push({
                Name: 'name',
                Value: fullname
            });
        }
        try {
            if (updateAttributes.length) {
                //Existing user - update email in congnito
                await cognitoClient.adminUpdateUserAttributes({
                    UserPoolId: process.env.USERPOOL_ID,
                    Username: username,
                    UserAttributes: updateAttributes
                });
            }
            if (disabled && user.Enabled) {
                await cognitoClient.adminDisableUser({
                    UserPoolId: process.env.USERPOOL_ID,
                    Username: username
                });
            }
            else if (!disabled && !user.Enabled) {
                await cognitoClient.adminEnableUser({
                    UserPoolId: process.env.USERPOOL_ID,
                    Username: username
                });
            }
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
    //Update Dynamo with the user data
    try {
        var dynamoProps = {
            TableName: process.env.USER_TABLE,
            Key: marshall({ id: user.Username }),
            ReturnValues: "ALL_NEW",
            ExpressionAttributeNames: {
                '#userroles': 'roles',
                '#userrights': 'rights',
                '#tenantids': 'usertenants',
                '#email': 'email',
                '#name': 'name',
                '#enabled': 'enabled'
            },
            ExpressionAttributeValues: {
                ':roles': marshall(roles || ''),
                ':rights': marshall(rights || ''),
                ':tenantids': marshall(tenantids || ''),
                ':email': marshall(email || getAttributeValue(user.UserAttributes, 'email')),
                ':name': marshall(fullname || getAttributeValue(user.UserAttributes, 'name')),
                ":enabled": marshall(!disabled)
            },
            UpdateExpression: 'SET #email=:email, #name=:name, #userroles=:roles, #userrights=:rights, #tenantids=:tenantids, #enabled=:enabled'
        }
        if (!existingUser) {
            dynamoProps.ExpressionAttributeNames['#createddate'] = 'createddate';
            dynamoProps.ExpressionAttributeValues[':createddate'] = marshall(new Date().getTime());
            dynamoProps.UpdateExpression += ', #createddate=:createddate';
        }
        await dynamoClient.updateItem(dynamoProps);
    }
    catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message
            })
        }
    }
    return {
        statusCode: 200,
        body: JSON.stringify(response)
    }
}

function getAttributeValue(userAttributes, attributeName) {
    return userAttributes.find((attr) => { return attr.Name == attributeName })?.Value || null;
}