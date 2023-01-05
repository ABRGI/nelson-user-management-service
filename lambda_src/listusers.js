/*
    Function lists all users based on search criteria
    params:
        tenantid: string - hotel id for which the user has access to
        email: string - email of the user being searched
        userroleid: role id of for which the search is made
*/

const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { unmarshall, marshall } = require("@aws-sdk/util-dynamodb");

const dynamoProps = { region: process.env.ENV_REGION }
if (process.env.LOCAL) {
    dynamoProps.credentials = {
        accessKeyId: process.env.ACCESSKEY,
        secretAccessKey: process.env.SECRETKEY
    };
}
const dynamoClient = new DynamoDB(dynamoProps);

exports.handler = async (event) => {
    var response = {};
    const { tenantid, email, userroleid, limit, lastevaluatedid } = event.queryStringParameters;

    try {
        var dynamoProps = {
            TableName: process.env.USER_TABLE,
            ReturnConsumedCapacity: "INDEXES",
            ExpressionAttributeNames: {
                '#roles': 'roles'
            },
            ProjectionExpression: 'id, email, #roles'
        };
        if (limit) {
            dynamoProps.Limit = parseInt(limit);
        }
        if (lastevaluatedid) {
            dynamoProps.ExclusiveStartKey = marshall({ id: lastevaluatedid });
        }
        const dynamoResponse = await dynamoClient.scan(dynamoProps);
        var unmarshalledData = [];
        dynamoResponse.Items.forEach(function (item) {
            unmarshalledData.push(unmarshall(item));
        });
        response = {
            users: unmarshalledData,
            consumedcapacityUnits: dynamoResponse.ConsumedCapacity.CapacityUnits,
        };
        if (dynamoResponse.LastEvaluatedKey) {
            response.lastEvaluatedId = unmarshall(dynamoResponse.LastEvaluatedKey);
        }
    } catch (err) {
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
    };
}