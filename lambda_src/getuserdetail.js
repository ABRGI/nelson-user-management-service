/*
    Function gets the user detail from cognito and dynmo
    parameters:
        userid: required
*/
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamoProps = { region: process.env.ENV_REGION };
if (process.env.LOCAL) {
    dynamoProps.credentials = {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    };
}
const dynamoClient = new DynamoDB(dynamoProps);

exports.handler = async (event) => {
    const { userid } = event.queryStringParameters;
    var response = {};
    //Get the user from dynamo
    try {
        const dynamoResponse = await dynamoClient.getItem({
            TableName: process.env.USER_TABLE,
            ReturnConsumedCapacity: "INDEXES",
            Key: marshall({ id: userid })
        });
        if (dynamoResponse.Item) {
            response.user = unmarshall(dynamoResponse.Item);
        }
        response.consumedcapacityUnits = dynamoResponse.ConsumedCapacity.CapacityUnits;
    }
    catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message
            })
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify(response)
    };
};