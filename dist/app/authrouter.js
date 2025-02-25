"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_promise_router_1 = __importDefault(require("express-promise-router"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const jwt = __importStar(require("jsonwebtoken"));
const resterror_1 = __importDefault(require("./resterror"));
const loginTokens = __importStar(require("./logintokens"));
const mailgun_js_1 = __importDefault(require("mailgun.js"));
const trivia2025_shared_1 = require("@scottglz/trivia2025-shared");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const querystring = __importStar(require("querystring"));
const JWT_SECRET = config_1.config.JWT_SECRET;
const router = (0, express_promise_router_1.default)();
const storage = config_1.config.storage;
const mailgunApp = new mailgun_js_1.default(FormData);
const mailgunClient = mailgunApp.client({
    username: 'api',
    key: config_1.config.mailgun.apiKey
});
const matchesUserEmail = (email) => (user) => user.email === email;
const matchesUserId = (userid) => (user) => user.userid === userid;
function afterUserAuthenticated(userid, res) {
    const webTokenPayload = {
        userid: userid
    };
    const webToken = jwt.sign(webTokenPayload, JWT_SECRET, { expiresIn: '365d' });
    res.cookie(JWT_COOKIE, webToken, { httpOnly: true, sameSite: true, maxAge: 1000 * 60 * 60 * 24 * 30 });
    res.redirect('/');
}
function verifyJwt(webTokenEncoded, secret) {
    return new Promise(function (resolve, reject) {
        jwt.verify(webTokenEncoded, secret, async function (err, decoded) {
            if (err) {
                reject(new resterror_1.default(401, 'Bad or Expired Web Token'));
            }
            else {
                resolve(decoded);
            }
        });
    });
}
router.use((0, express_1.json)());
router.use((0, cookie_parser_1.default)());
const JWT_COOKIE = 'djywhxk';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use(async function (req, _res) {
    const jwtCookieVal = req.cookies[JWT_COOKIE];
    if (jwtCookieVal) {
        const jwt = await verifyJwt(jwtCookieVal, JWT_SECRET);
        const userid = jwt.userid;
        const user = (await storage.getUsers()).find(matchesUserId(userid));
        if (!user) {
            console.log('unknown user');
            console.log(JSON.stringify(await storage.getUsers()));
            throw new resterror_1.default(401, 'Unknown User');
        }
        req.user = user;
    }
    return Promise.resolve('next');
});
router.post('/auth/logout', async function (req, res) {
    res.clearCookie(JWT_COOKIE);
    res.json(true);
});
router.post('/auth/requestemailsignin', async function (request, response) {
    const email = request.body.email.trim();
    if (!email) {
        throw new resterror_1.default(400, 'Invalid email address');
    }
    const user = (await storage.getUsers()).find(matchesUserEmail(email));
    if (!user) {
        throw new resterror_1.default(400, `There is no user with the email address "${email}".`);
    }
    const token = loginTokens.generateToken(user.userid);
    const baseUrl = 'https://' + request.get('host');
    const data = {
        from: config_1.config.mailFrom,
        to: email,
        subject: 'Trivia Login Magic Link',
        html: `
<p>
<a href="${baseUrl}/auth/magiclink/${token}">Click here</a> to sign into the Trivia Server.
This link is only valid for five minutes from when this message was sent.
</p> 
`
    };
    await mailgunClient.messages.create(config_1.config.mailgun.domain, data);
    response.json({ ok: true });
});
router.get('/auth/magiclink/:token([0-9a-fA-F]+)', async function (request, response) {
    const token = request.params.token;
    const tokenRecord = loginTokens.checkToken(token);
    if (tokenRecord) {
        // Get our userid from that slack info, like slackresponse.user.email
        const userid = tokenRecord.userid;
        const user = (await storage.getUsers()).find(matchesUserId(userid));
        if (user) {
            afterUserAuthenticated(user.userid, response);
            return;
        }
    }
    response.send('Sorry, your magic link is either expired, already used, or invalid.');
});
router.get('/auth/slackredirect', async function (request, response) {
    const params = request.query;
    if (params.error) {
        throw new Error('Error from Slack: ' + params.error);
    }
    const code = params.code;
    const baseUrl = params.state;
    const redirect_uri = baseUrl + '/auth/slackredirect';
    if (code) {
        const slackresponse = await axios_1.default.get('https://slack.com/api/oauth.access?' +
            querystring.stringify({
                client_id: '456894231392.459012826326',
                client_secret: config_1.config.SLACK_OATH_SECRET,
                code: code,
                redirect_uri: redirect_uri
            }));
        let slackUser = slackresponse.data.user;
        if (!slackUser) {
            const accessToken = slackresponse.data.access_token;
            if (!accessToken) {
                throw new Error('No User and No Access Token: ' + JSON.stringify(slackresponse));
            }
            const nextResponse = await axios_1.default.get('https://slack.com/api/users.identity?token=' + accessToken);
            slackUser = nextResponse.data.user;
            if (!slackUser) {
                throw new Error('STILL no slackUser?');
            }
        }
        // Get our userid from that slack info, like slackresponse.user.email
        const email = slackUser.email;
        let user = (await storage.getUsers()).find(matchesUserEmail(email));
        if (!user) {
            user = await storage.createUser(slackUser.name, slackUser.email, (0, trivia2025_shared_1.dateToDayString)(new Date()));
        }
        afterUserAuthenticated(user.userid, response);
    }
    else {
        response.render('page.html', {
            message: 'Something went wrong, sorry. :-/'
        });
    }
});
exports.default = router;
