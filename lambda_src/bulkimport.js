/**
Bulk imports multiple users to Cognito and DynamoDB.
The function processes an array of users and creates them in Cognito if they don't exist
For each user, it creates entries in both Cognito and the user database
Failed user imports are collected and returned in the response
Parameters:
required - users: Array of user objects with the following properties:
required - username: string or email
required - email: string email of the user
required - name: string full name of the user
optional - roles: Comma separated UID of the roles - will be added to the user
optional - tenantids: Comma separated UIDs of tenants - will be appended to the user
optional - environmentids: Comma separated UIDs of environments - Will be appended to user
optional - hotelids: Comma separated UIDs of hotels - Will be appended to user
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
    const { users } = JSON.parse(event.body);
    if (!users || !Array.isArray(users) || users.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Invalid request. 'users' must be a non-empty array."
            })
        };
    }

    var successfulImports = [];
    var failedImports = [];
    var totalUsers = users.length;

    // Process each user
    for (var i = 0; i < users.length; i++) {
        var userItem = users[i];
        var { username, email, name, roles, tenantids, environmentids, hotelids, disabled = false, isoCountryCode, phoneNumber } = userItem;

        // Validate required fields
        if (!username || !email || !name) {
            failedImports.push({
                user: userItem,
                error: "Missing required fields: username, email, or name"
            });
            continue;
        }

        try {
            // Check if user already exists in Cognito
            var existingUser = false;
            var user = null;
            try {
                user = await cognitoClient.adminGetUser({
                    UserPoolId: process.env.USERPOOL_ID,
                    Username: email
                });
                existingUser = true;
                failedImports.push({
                    user: userItem,
                    error: `User ${username} already exists`
                });
                continue;
            } catch (err) {
                if (err.__type == 'UserNotFoundException') {
                    user = null;
                    existingUser = false;
                }
                else {
                    throw err;
                }
            }

            // Create the new user in Cognito
            var newUserResult = await cognitoClient.adminCreateUser({
                UserPoolId: process.env.USERPOOL_ID,
                Username: email,
                TemporaryPassword: process.env.TEMP_PASSWORD,
                MessageAction: MessageActionType.SUPPRESS,
                DesiredDeliveryMediums: [DeliveryMediumType.EMAIL],
                ForceAliasCreation: true,
                UserAttributes: [
                    {
                        Name: 'name',
                        Value: name
                    },
                    {
                        Name: 'email',
                        Value: email
                    },
                    {
                        Name: 'email_verified',
                        Value: 'true'
                    }
                ]
            });
            user = newUserResult.User;

            // Update DynamoDB with the user data
            var dynamoUpdateProps = {
                TableName: process.env.USER_TABLE,
                Key: marshall({ id: username }),
                ExpressionAttributeNames: {
                    '#userroles': 'roles',
                    '#tenantids': 'tenantids',
                    '#environmentids': 'environmentids',
                    '#hotelids': 'hotelids',
                    '#email': 'email',
                    '#name': 'name',
                    '#enabled': 'enabled',
                    '#createddate': 'createddate',
                    '#confirmed': 'confirmed'
                },
                ExpressionAttributeValues: {
                    ':roles': marshall(roles || ''),
                    ':tenantids': marshall(tenantids || ''),
                    ':environmentids': marshall(environmentids || ''),
                    ':hotelids': marshall(hotelids || ''),
                    ':email': marshall(email),
                    ':name': marshall(name),
                    ':enabled': marshall(!disabled),
                    ':createddate': marshall(new Date().getTime()),
                    ':confirmed': marshall(false)
                },
                UpdateExpression: 'SET #email=:email, #name=:name, #userroles=:roles, #tenantids=:tenantids, #environmentids=:environmentids, #hotelids=:hotelids, #enabled=:enabled, #createddate=:createddate, #confirmed=:confirmed'
            };

            if (isoCountryCode !== undefined && isoCountryCode !== null) {
                dynamoUpdateProps.ExpressionAttributeNames['#isoCountryCode'] = 'isoCountryCode';
                dynamoUpdateProps.ExpressionAttributeValues[':isoCountryCode'] = marshall(isoCountryCode);
                dynamoUpdateProps.UpdateExpression += ', #isoCountryCode=:isoCountryCode';
            }
            if (phoneNumber !== undefined && phoneNumber !== null) {
                dynamoUpdateProps.ExpressionAttributeNames['#phoneNumber'] = 'phoneNumber';
                dynamoUpdateProps.ExpressionAttributeValues[':phoneNumber'] = marshall(phoneNumber);
                dynamoUpdateProps.UpdateExpression += ', #phoneNumber=:phoneNumber';
            }

            await dynamoClient.updateItem(dynamoUpdateProps);

            successfulImports.push({
                username: username,
                email: email,
                name: name
            });

        } catch (err) {
            // If user creation failed, add to failed imports
            failedImports.push({
                user: userItem,
                error: err.message
            });
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Bulk import completed",
            total: totalUsers,
            successful: successfulImports.length,
            failed: failedImports.length,
            successfulImports: successfulImports,
            failedImports: failedImports
        })
    };
};