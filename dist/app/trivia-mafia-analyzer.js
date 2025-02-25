"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuestions = getQuestions;
exports.analyze = analyze;
const trivia2025_shared_1 = require("@scottglz/trivia2025-shared");
const MILLIS_IN_HOUR = 60 * 60 * 1000;
const MILLIS_PER_DAY = MILLIS_IN_HOUR * 24;
function getQuestions(body) {
    const ret = [];
    for (let i = 1; i <= 5; i++) {
        const match = body.match(new RegExp('^ *' + i + '\\. *(.*)$', 'm'));
        if (match) {
            ret.push(match[1]);
        }
    }
    return ret;
}
const THURSDAY = 4;
function analyze(utcDate, body) {
    const day = new Date(utcDate).getUTCDay();
    const rawQuestions = getQuestions(body);
    // Always load up the next 5 days worth of questions, unless if it's (themed)
    // Thursday, when we just do 1
    let questions;
    if (day === THURSDAY) {
        // Just the third
        questions = [rawQuestions[2]];
    }
    else {
        questions = [rawQuestions[2], rawQuestions[3], rawQuestions[1], rawQuestions[4], rawQuestions[0]];
    }
    return questions.map(function (question, i) {
        return {
            q: question,
            day: (0, trivia2025_shared_1.dateToDayString)(utcDate + (i + 1) * MILLIS_PER_DAY)
        };
    });
}
;
