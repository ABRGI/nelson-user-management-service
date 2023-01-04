exports.handler = async (event) => {
    event.response.claimsOverrideDetails = {
        claimsToAddOrOverride: {
            "custom:tenantids": "TestAttr",
            "custom:role": "NELSON_ADMIN",
            "custom:rights": "NONE"
        }
    }
    return event;
}
