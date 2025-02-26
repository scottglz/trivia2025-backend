"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("./app/config");
const restrouter_1 = __importDefault(require("./app/restrouter"));
const authrouter_1 = __importDefault(require("./app/authrouter"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const resterror_1 = __importDefault(require("./app/resterror"));
const nocache_1 = __importDefault(require("nocache"));
const app = (0, express_1.default)();
const http = new http_1.Server(app);
app.use((0, nocache_1.default)());
app.use(authrouter_1.default);
app.use('/trivia', restrouter_1.default);
app.use(function (req, res) {
    res.status(404).send({ status: 404, message: 'NOT_FOUND' });
});
const errorHandler = function (err, req, res, next) {
    if (err instanceof resterror_1.default) {
        res.status(err.status).send({ status: err.status, message: err.message });
    }
    else {
        res.status(500).send({ status: 500, message: '' + err });
    }
};
app.use(errorHandler);
const server = http.listen(config_1.config.port, '::', function () {
    console.log('Server running on port ' + config_1.config.port);
});
server.on('error', console.error);
