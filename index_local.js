var express = require('express');
var bodyParser = require('body-parser');
var userlogin = require('./lambda_src/userlogin');
var updateuser = require('./lambda_src/updateuser');
var confirmuser = require('./lambda_src/confirmuser');

var port = 8080;
var app = express();
app.use(bodyParser.json());

app.post('/api/user/login', function (req, res) {
    console.log(`Login function accessed with data: ${req.body}`);
    userlogin.handler({ body: JSON.stringify(req.body) }).then(function (ret) {
        res.statusCode = ret.statusCode;
        var respBody = JSON.parse(ret.body);
        res.send(respBody);
    }).catch(function (error) {
        console.log(error);
    }).finally(function () {
        res.send();
    });
});

app.post('/api/user/update', function (req, res) {
    console.log(`User update function accessed with data: ${req.body}`);
    updateuser.handler({ body: JSON.stringify(req.body) }).then(function (ret) {
        res.statusCode = 200;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    }).finally(function () {
        res.send();
    });
});

app.post('/api/user/updatepassword', function (req, res) {
    console.log(`Password update function accessed with data: ${req.body}`);
    confirmuser.handler({ body: JSON.stringify(req.body) }).then(function (ret) {
        res.statusCode = 200;
        res.send(JSON.parse(ret.body));
    }).catch(function (err) {
        console.log(err);
    }).finally(function () {
        res.send();
    });
});

app.listen(port, function () {
    console.log(`Server started on port ${port}`);
});