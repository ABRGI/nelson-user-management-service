const express = require('express');
const bodyParser = require('body-parser');
const userlogin = require('./lambda_src/userlogin');
const updateuser = require('./lambda_src/updateuser');
const getuserdetail = require('./lambda_src/getuserdetail');
const confirmuser = require('./lambda_src/confirmuser');
const pretokengenerator = require('./lambda_src/preauthtokengenerator');
const listusers = require('./lambda_src/listusers');
const roles = require('./lambda_src/roles');
const adminresetpassword = require('./lambda_src/adminresetpassword');
const forgotpassword = require('./lambda_src/forgotpassword');
const confirmforgotpassword = require('./lambda_src/confirmforgotpassword');
const changeuserpassword = require('./lambda_src/changeuserpassword');

const port = process.env.PORT;
var app = express();
app.use(bodyParser.json());

app.post('/localtest/pretokengenerator', function (req, res) {
    console.log('Testing pre token generator');
    pretokengenerator.handler(req.body).then(function (ret) {
        res.send(ret);
    }).catch(function (err) {
        console.log(err);
    });
});

app.get('/api/management/secure/site-host', function (req, res) {
    res.send(`localhost:${port}`);
});

app.post('/api/user/login', function (req, res) {
    console.log(`Login function accessed with data: ${req.body}`);
    userlogin.handler({ body: JSON.stringify(req.body) }).then(function (ret) {
        res.statusCode = ret.statusCode;
        var respBody = JSON.parse(ret.body);
        res.send(respBody);
    }).catch(function (error) {
        console.log(error);
    });
});

app.post('/api/user/logout', function (req, res) { res.send(); });

app.post('/api/user/user', function (req, res) {
    console.log(`User update function accessed with data:`);
    console.log(req.body);
    updateuser.handler({ body: JSON.stringify(req.body) }).then(function (ret) {
        res.statusCode = ret.statusCode;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    });
});

app.get('/api/user/user', function (req, res) {
    console.log(`Get user function accessed for user: `);
    console.log(req.query);
    getuserdetail.handler({ queryStringParameters: req.query }).then(function (ret) {
        res.statusCode = ret.statusCode;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    });
});

app.post('/api/user/confirmuser', function (req, res) {
    console.log(`Confirm user function accessed with data: ${req.body}`);
    confirmuser.handler({ body: JSON.stringify(req.body) }).then(function (ret) {
        res.statusCode = ret.statusCode;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    });
});

app.get('/api/user/listusers', function (req, res) {
    console.log(`List users function accessed with data:`);
    console.log(req.query);
    listusers.handler({ queryStringParameters: req.query }).then(function (ret) {
        res.statusCode = 200;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    })
});

app.get('/api/user/roles', function (req, res) {
    console.log(`List roles function accessed`);
    roles.handler().then(function (ret) {
        res.statusCode = ret.statusCode;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    });
});

app.post('/api/user/resetpassword', function (req, res) {
    console.log(`Reset password function accessed with data: ${req.body}`);
    adminresetpassword.handler({ body: JSON.stringify(req.body) }).then(function (ret) {
        res.statusCode = ret.statusCode;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    });
});

app.post('/api/user/forgotpassword', function (req, res) {
    console.log(`Forgot password function accessed with data: ${req.body}`);
    forgotpassword.handler({ body: JSON.stringify(req.body) }).then(function (ret) {
        res.statusCode = ret.statusCode;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    });
});

app.post('/api/user/confirmforgotpassword', function (req, res) {
    console.log(`Confirm forgot password function accessed with data: ${req.body}`);
    confirmforgotpassword.handler({ body: JSON.stringify(req.body) }).then(function (ret) {
        res.statusCode = ret.statusCode;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    });
});

app.post('/api/user/changeuserpassword', function (req, res) {
    console.log(`User reset password function accessed with data: ${req.body}`);
    changeuserpassword.handler({
        headers: { Authorization: req.headers.authorization },
        body: JSON.stringify(req.body)
    }).then(function (ret) {
        res.statusCode = ret.statusCode;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    });
});

app.listen(port, function () {
    console.log(`Server started on port ${port}`);
});