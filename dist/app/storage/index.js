"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingStorage = exports.PgStorage = void 0;
var pgstorage_1 = require("./pgstorage");
Object.defineProperty(exports, "PgStorage", { enumerable: true, get: function () { return __importDefault(pgstorage_1).default; } });
var cachingstorage_1 = require("./cachingstorage");
Object.defineProperty(exports, "CachingStorage", { enumerable: true, get: function () { return __importDefault(cachingstorage_1).default; } });
