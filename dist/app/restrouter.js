"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_promise_router_1 = __importDefault(require("express-promise-router"));
const axios_1 = __importDefault(require("axios"));
const better_sse_1 = require("better-sse");
const config_1 = require("./config");
const trivia_mafia_analyzer_1 = require("./trivia-mafia-analyzer");
const resterror_1 = __importDefault(require("./resterror"));
const trivia2025_shared_1 = require("@scottglz/trivia2025-shared");
const router = (0, express_promise_router_1.default)();
const storage = config_1.config.storage;
const MILLIS_IN_HOUR = 60 * 60 * 1000;
function allGraded(question) {
    return question.guesses.every(guess => guess.correct === true || guess.correct === false);
}
function hasUserGuessed(question, userid) {
    return question.guesses.some(guess => guess.userid === userid && !!guess.guess);
}
function allUsersGuessed(question, users) {
    return users.every(user => !(0, trivia2025_shared_1.isUserActive)(user, question.day) || hasUserGuessed(question, user.userid));
}
async function getFullQuestions(earliestDay, latestDay) {
    const today = (0, trivia2025_shared_1.today)();
    if (latestDay > today) {
        latestDay = today;
    }
    const questions = await storage.getFullQuestions(earliestDay, latestDay);
    return questions;
}
router.use((0, express_1.json)());
router.use((0, express_1.urlencoded)({ extended: false }));
let allSessions = [];
router.get('/sse', async (request, response) => {
    const session = await (0, better_sse_1.createSession)(request, response);
    const user = request.user;
    allSessions.push({
        session,
        user: user
    });
    console.log(`SSE session with ${user?.username ?? '<guest>'} st arted`);
    session.on('disconnected', () => {
        allSessions = allSessions.filter((entry) => entry.session !== session);
        console.log(`SSE session with ${user?.username ?? '<guest>'} en ded`);
    });
});
router.get('/whoami', function (request, response) {
    if (request.user) {
        response.json(request.user);
    }
    else {
        response.json(false);
    }
});
router.post('/slack', async function (request, response) {
    response.json({
        response_type: 'in_channel',
        text: 'One moment please...'
    });
    const message = request.body.text;
    const responseUrl = request.body.response_url;
    const count = Math.abs(parseInt(message.trim(), 10)) || 0;
    const millis = new Date().getTime() - 8 * MILLIS_IN_HOUR - count * 24 * MILLIS_IN_HOUR;
    const day = (0, trivia2025_shared_1.daysAgo)(count);
    const dayDisplay = (0, trivia2025_shared_1.formatDateFancy)(new Date(millis));
    const questions = await getFullQuestions(day, day);
    if (!questions.length) {
        axios_1.default.post(responseUrl, {
            response_type: 'in_channel',
            text: 'I don\'t have any trivia for ' + dayDisplay + ' (disapproval)'
        });
    }
    else {
        const message = 'Trivia for ' + dayDisplay + ': ' + questions[0].q;
        axios_1.default.post(responseUrl, {
            response_type: 'in_channel',
            text: message
        });
    }
});
router.put('/email', async function (request, response) {
    const body = request.body;
    const dateNum = body.date;
    const emailBody = body.body;
    const questions = (0, trivia_mafia_analyzer_1.analyze)(dateNum, emailBody);
    await storage.upsertQuestions(questions);
    response.json(questions);
});
router.post('/crasho', async function () {
    const x = null;
    const y = x.die;
    return y;
});
router.get('/users', async function (_request, response) {
    const users = await storage.getUsers();
    response.json(users);
});
router.post('/questions', async function (request, response) {
    const body = request.body;
    const user = request.user;
    if (!body.earliestDay || !body.latestDay) {
        throw new resterror_1.default(400, 'earliestDay and latestDay Required');
    }
    const questions = await getFullQuestions(body.earliestDay, body.latestDay);
    const users = await storage.getUsers();
    // Eliminate the data the user isn't allowed to know if they haven't guessed yet or aren't
    // logged in
    for (const question of questions) {
        const userCouldAnwerThisQuestion = user && (0, trivia2025_shared_1.isUserActive)(user, question.day);
        const canSeeAnswers = userCouldAnwerThisQuestion ? hasUserGuessed(question, user.userid) : question.a && allUsersGuessed(question, users);
        if (!canSeeAnswers) {
            question.a = null;
            question.guesses = [];
        }
    }
    response.json(questions);
});
router.post('/question/details', userRequired, async function (request, response) {
    const day = request.body.day;
    const questions = await getFullQuestions(day, day);
    const question = questions[0];
    const users = await storage.getUsers();
    const comments = await storage.getComments(day);
    response.json({ question, users, comments });
});
function userRequired(request) {
    if (!request.user) {
        throw new resterror_1.default(401, 'User Required');
    }
    else {
        return Promise.resolve('next');
    }
}
router.put('/guess', userRequired, async function (request, response) {
    const { questionid: day, guess } = request.body;
    if (!guess) {
        throw new resterror_1.default(400, "Guess Required");
    }
    await storage.insertGuess(day, request.user.userid, guess);
    const question = await afterGuess(day, request.user.userid);
    response.json(question);
});
/*
router.post('/comments/add', userRequired, async function(request: RequestFor<any>, response) {
   const body = request.body;
   await storage.insertComment(body.day, request.user.userid, body.comment);
   response.json({});
});
*/
function messageSlack(message) {
    const data = {
        text: message
    };
    axios_1.default.post(config_1.config.SLACKHOOK_URL, data);
}
async function afterGuess(day, userGuessing) {
    const questions = await getFullQuestions(day, day);
    if (!questions.length) {
        return;
    }
    const question = questions[0];
    const users = await storage.getUsers();
    await sendSocketUpdates(question, userGuessing);
    if (allUsersGuessed(question, users)) {
        const guessesMsg = question.guesses.map(function (guess) {
            return '"' + guess.guess + '"';
        }).join(', ');
        const msg = 'All guesses are in for ' + trivia2025_shared_1.dayNames[(0, trivia2025_shared_1.dayStringToDate)(day).getDay()] + '. ' + guessesMsg;
        messageSlack(msg);
    }
    return question;
}
const questionWrapupsAllMissed = 'Nobody got "%A%" on %DAY%. So sad.';
const questionWrapupsOneRight = 'Only %WHORIGHT% got "%A%" right on %DAY%. Everyone else is terrible.';
const questionWrapupsOneWrong = 'Everyone except poor old %WHOWRONG% got "%A%" right on %DAY%.';
const questionWrapupsAllRight = 'Everybody got "%A%" on %DAY%. Congratulations (?)';
const questionWrapupsOther = '%WHORIGHT% got "%A%" right on %DAY%. %WHOWRONG% missed it.';
function joinNames(names) {
    const last = names.length - 1;
    const s = last > 0 ? names.slice(0, last).join(', ') + ' and ' : '';
    return s + names[last];
}
async function sendSocketUpdates(question, skipUserId) {
    const users = await storage.getUsers();
    if (question.a && allUsersGuessed(question, users)) {
        allSessions.forEach((sessionEntry) => {
            const userId = sessionEntry.user?.userid ?? 0;
            if (sessionEntry.session.isConnected && userId !== skipUserId) {
                sessionEntry.session.push(question);
            }
        });
        return;
    }
    const userIdsThatHaveGuessed = new Set(question.guesses.map((guess) => guess.userid));
    allSessions.forEach((sessionEntry) => {
        const userId = sessionEntry.user?.userid ?? 0;
        if (sessionEntry.session.isConnected && userId !== skipUserId && userIdsThatHaveGuessed.has(userId)) {
            sessionEntry.session.push(question);
        }
    });
}
async function getUserIdsToNamesMap() {
    const usersArray = await storage.getUsers();
    return new Map(usersArray.map(user => [user.userid, user.username]));
}
async function afterGrading(day, gradingUserid) {
    const questions = await getFullQuestions(day, day);
    if (questions.length === 1) {
        const question = questions[0];
        await sendSocketUpdates(question, gradingUserid);
        if (question.a && allGraded(question)) {
            const guesses = question.guesses;
            const userNames = await getUserIdsToNamesMap();
            const rightNames = guesses.filter(guess => guess.correct).map(guess => userNames.get(guess.userid) || '');
            const wrongNames = guesses.filter(guess => !guess.correct).map(guess => userNames.get(guess.userid) || '');
            const numberCorrect = rightNames.length;
            const numGuesses = guesses.length;
            let msg;
            if (numberCorrect === 0) {
                msg = questionWrapupsAllMissed;
            }
            else if (numberCorrect === 1) {
                msg = questionWrapupsOneRight;
            }
            else if (numberCorrect === numGuesses - 1) {
                msg = questionWrapupsOneWrong;
            }
            else if (numberCorrect === numGuesses) {
                msg = questionWrapupsAllRight;
            }
            else {
                msg = questionWrapupsOther;
            }
            const whoRight = joinNames(rightNames);
            const whoWrong = joinNames(wrongNames);
            const dayDisplay = trivia2025_shared_1.dayNames[(0, trivia2025_shared_1.dayStringToDate)(day).getDay()];
            msg = msg.replace('%A%', question.a).replace('%DAY%', dayDisplay).replace('%WHORIGHT%', whoRight).replace('%WHOWRONG%', whoWrong);
            messageSlack(msg);
        }
        return question;
    }
}
router.put('/grade', userRequired, async function (request, response) {
    const { questionid: day, answer, grades } = request.body;
    await storage.insertAnswerAndGrades(day, answer, grades);
    const question = await afterGrading(day, request.user.userid);
    response.json(question);
});
router.put('/editanswer', userRequired, async function (request, response) {
    const { questionid: day, answer } = request.body;
    const question = (await getFullQuestions(day, day))[0];
    if (!question) {
        throw new resterror_1.default(404, 'No Question For That Day');
    }
    if (!question.a) {
        throw new resterror_1.default(400, 'Question has not been graded yet');
    }
    if (answer === question.a) {
        response.json(question);
        return;
    }
    await storage.updateAnswer(day, answer);
    const updatedQuestion = (await getFullQuestions(day, day))[0];
    messageSlack(`Answer for ${question.day} changed from "${question.a}" to "${updatedQuestion.a}". (Changed by ${request.user.username})`);
    response.json(updatedQuestion);
});
router.put('/editgrade', userRequired, async function (request, response) {
    const { questionid: day, userid, correct } = request.body;
    await storage.updateGrade(day, userid, correct);
    const questions = await getFullQuestions(day, day);
    const question = questions[0];
    if (question) {
        const guess = question.guesses.find(guess => guess.userid === userid);
        if (guess) {
            await sendSocketUpdates(question, request.user.userid);
            const userNames = await getUserIdsToNamesMap();
            const userName = userNames.get(userid);
            messageSlack(`Scoring correction for ${question.day}: ${userName}'s answer of "${guess.guess}" is ${correct ? 'right' : 'wrong'}. (Changed by ${request.user.username})`);
        }
    }
    response.json(question);
});
router.post('/endvacation', userRequired, async function (request, response) {
    const user = request.user;
    const today = (0, trivia2025_shared_1.today)();
    // If today's question has already been graded, then the user can start tomorrow.
    // If not, then they can start today
    const questions = await storage.getFullQuestions(today, today);
    let restartWhen = today;
    if (questions && questions[0] && questions[0].a) {
        // Today's is already graded
        restartWhen = (0, trivia2025_shared_1.tomorrow)();
    }
    await storage.startStopUser(user.userid, restartWhen);
    response.json({ users: await storage.getUsers() });
});
exports.default = router;
