const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

var port = 4000;
var app = express();

app.use(createProxyMiddleware('/api/user/login', {
    target: 'http://test.nelson.management',
    changeOrigin: true
}));

app.use(createProxyMiddleware('/api/user/logout', {
    target: 'http://test.nelson.management',
    changeOrigin: true
}));

app.use(createProxyMiddleware('/api/user/user', {
    target: 'http://test.nelson.management',
    changeOrigin: true
}));

app.use(createProxyMiddleware('/api/user/listusers', {
    target: 'http://test.nelson.management',
    changeOrigin: true
}));

app.use(createProxyMiddleware('/api/user/roles', {
    target: 'http://test.nelson.management',
    changeOrigin: true
}));

app.listen(port, function () {
    console.log(`Server started on port ${port}`);
});