/*
    Function Get all roles available in Nelson
    TODO: Update the function to be able to create and define role rights in a POST request
*/

const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamoProps = { region: process.env.ENV_REGION };
if (process.env.LOCAL) {
    dynamoProps.credentials = {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    };
}
const dynamoClient = new DynamoDB(dynamoProps);

exports.handler = async () => {
    try {
        const dynamoResponse = await dynamoClient.scan({
            TableName: process.env.ACCESS_ROLES_TABLE,
            ReturnConsumedCapacity: "INDEXES"
        });
        var unmarshalledData = [];
        dynamoResponse.Items.forEach(function (item) {
            unmarshalledData.push(unmarshall(item));
        });
        return {
            statusCode: 200,
            body: JSON.stringify({
                roles: unmarshalledData,
                consumedcapacityUnits: dynamoResponse.ConsumedCapacity.CapacityUnits
            })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err.message
            })
        };
    }
};