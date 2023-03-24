/*
    Function lists all users based on search criteria
    params:
        tenantids: comma separated string - hotel id for which the user has access to
        email: string - partial email of the user being searched
        userroleid: string role id of for which the search is made
        lastevaluatedid: string when pagination is required
        limit: number specifying limit to fetch
        activeonly: boolean if only the active users are reuqired. Default false
        countonly: boolean if only the count of active users is required. Default false
        includeenvironments: boolean if environment data is required. Default false
*/

const { DynamoDB, Select } = require("@aws-sdk/client-dynamodb");
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
    const { tenantid, email, userroleids, limit, lastevaluatedid, activeonly = false, countonly = false, includeenvironments = false } = event.queryStringParameters || {};

    try {
        var dynamoProps = {
            TableName: process.env.USER_TABLE,
            ReturnConsumedCapacity: "INDEXES",
        };
        if (lastevaluatedid) {
            dynamoProps.ExclusiveStartKey = marshall({ id: lastevaluatedid });
        }
        if (countonly == 'true') {
            dynamoProps.Select = Select.COUNT
        }
        else {
            //Use limit only if count is set to false
            if (limit) {
                dynamoProps.Limit = parseInt(limit);
            }
            dynamoProps.ExpressionAttributeNames = dynamoProps.ExpressionAttributeNames || {};
            dynamoProps.ExpressionAttributeNames['#roles'] = 'roles';
            dynamoProps.ProjectionExpression = 'id, email, #roles, tenantids';
            if (includeenvironments == 'true') {
                dynamoProps.ProjectionExpression += ', environmentids';
            }
        }
        if (tenantid) {
            dynamoProps.FilterExpression = dynamoProps.FilterExpression || '';
            dynamoProps.ExpressionAttributeValues = dynamoProps.ExpressionAttributeValues || {}
            dynamoProps.ExpressionAttributeValues[':tenantid'] = marshall(tenantid)
            dynamoProps.FilterExpression += `${dynamoProps.FilterExpression != '' ? ' AND ' : ''}contains(tenantids, :tenantid)`
        }
        if (email) {
            dynamoProps.FilterExpression = dynamoProps.FilterExpression || '';
            dynamoProps.ExpressionAttributeValues = dynamoProps.ExpressionAttributeValues || {}
            dynamoProps.ExpressionAttributeValues[':email'] = marshall(email)
            dynamoProps.FilterExpression += `${dynamoProps.FilterExpression != '' ? ' AND ' : ''}contains(email, :email)`
        }
        if (userroleids) {
            dynamoProps.FilterExpression = dynamoProps.FilterExpression || '';
            dynamoProps.ExpressionAttributeNames = dynamoProps.ExpressionAttributeNames || {};
            dynamoProps.ExpressionAttributeNames['#roles'] = 'roles';
            dynamoProps.ExpressionAttributeValues = dynamoProps.ExpressionAttributeValues || {}
            dynamoProps.ExpressionAttributeValues[':roles'] = marshall(userroleids)
            dynamoProps.FilterExpression += `${dynamoProps.FilterExpression != '' ? ' AND ' : ''}contains(:roles, #roles)`
        }
        if (activeonly == 'true') {
            dynamoProps.FilterExpression = dynamoProps.FilterExpression || '';
            dynamoProps.ExpressionAttributeValues = dynamoProps.ExpressionAttributeValues || {}
            dynamoProps.ExpressionAttributeValues[':enabled'] = marshall(true)
            dynamoProps.FilterExpression += `${dynamoProps.FilterExpression != '' ? ' AND ' : ''}enabled=:enabled`
        }
        var data = await fetchData(dynamoProps, countonly);
        response = data;
        var i = 0;
        //If the returned data doesn't include as much as the limit
        while (countonly != 'true' && response.lastEvaluatedId && response.users.length < parseInt(limit)) {
            dynamoProps.ExclusiveStartKey = marshall({ id: response.lastEvaluatedId });
            dynamoProps.limit = limit - response.users.length;
            data = await fetchData(dynamoProps, countonly);
            response.consumedCapacityUnits += data.consumedCapacityUnits;
            response.lastEvaluatedId = data.lastEvaluatedId;
            if (data.users) {
                response.users.push(...data.users);
            }
        }
    } catch (err) {
        console.log(event);
        console.log(err);
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

async function fetchData(dynamoProps, countonly) {
    var response = {};
    const dynamoResponse = await dynamoClient.scan(dynamoProps);
    var unmarshalledData = [];
    response = {
        consumedCapacityUnits: dynamoResponse.ConsumedCapacity.CapacityUnits,
    };
    if (countonly != 'true') {
        dynamoResponse.Items.forEach(function (item) {
            unmarshalledData.push(unmarshall(item));
        });
        response.users = unmarshalledData;
    }
    else {
        response.count = dynamoResponse.Count;
    }
    if (dynamoResponse.LastEvaluatedKey) {
        response.lastEvaluatedId = (unmarshall(dynamoResponse.LastEvaluatedKey)).id;
    }
    return response;
}
