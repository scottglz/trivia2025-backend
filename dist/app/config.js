"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const storage_1 = require("./storage");
const env = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && typeof defaultValue === 'undefined') {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value ?? defaultValue;
};
const pgOptions = {
    user: env('POSTGRES_USER'),
    host: env('POSTGRES_HOST'),
    database: env('POSTGRES_DATABASE'),
    password: env('POSTGRES_PASSWORD')
};
exports.config = {
    production: true,
    pgOptions: pgOptions,
    storage: new storage_1.CachingStorage(new storage_1.PgStorage(pgOptions)),
    port: +env('PORT', '3333'),
    mailgun: {
        apiKey: env('MAILGUN_APIKEY'),
        domain: env('MAILGUN_DOMAIN')
    },
    mailFrom: 'Trivia Bot <triviabot@thatpagethere.com>',
    SLACK_OATH_SECRET: env('SLACK_OATH_SECRET'),
    SLACKHOOK_URL: env('SLACKHOOK_URL'),
    JWT_SECRET: env('JWT_SECRET')
};
