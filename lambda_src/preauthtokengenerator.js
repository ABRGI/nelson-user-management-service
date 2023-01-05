const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamoProps = { region: process.env.ENV_REGION }
if (process.env.LOCAL) {
    dynamoProps.credentials = {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    };
}
const dynamoClient = new DynamoDB(dynamoProps);

exports.handler = async (event) => {
    try {
        var userData = await dynamoClient.getItem({
            TableName: process.env.USER_TABLE,
            Key: marshall({ id: event.userName })
        });
        var unmarshalledData = unmarshall(userData.Item);
        event.response.claimsOverrideDetails = {
            claimsToAddOrOverride: {
                "tenantids": unmarshalledData.usertenants || '',
                "roles": unmarshalledData.roles || '',
                "rights": unmarshalledData.rights || ''
            }
        }
    }
    catch (err) {
        console.log(err);
    }
    return event;
}

/*
Example event for nelson@nelson.management
{
    "version": "1",
    "triggerSource": "TokenGeneration_Authentication",
    "region": "eu-central-1",
    "userPoolId": "eu-central-1_vbbPJ9beu",
    "userName": "d1595c5a-3f6c-47eb-86a1-ba085d79f2df",
    "callerContext": {
        "awsSdkVersion": "aws-sdk-js-3.241.0",
        "clientId": "69ovn0ihplnva0icl1t0rva6j0"
    },
    "request": {
        "userAttributes": {
            "sub": "d1595c5a-3f6c-47eb-86a1-ba085d79f2df",
            "cognito:user_status": "CONFIRMED",
            "email": "nelson@nelson.management"
        },
        "groupConfiguration": {
            "groupsToOverride": [],
            "iamRolesToOverride": [],
            "preferredRole": null
        }
    },
    "response": { "claimsOverrideDetails": null }
}
*/