"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RestError extends Error {
    status;
    message;
    constructor(responseCode, message) {
        super();
        this.status = responseCode;
        this.message = message;
    }
}
exports.default = RestError;
