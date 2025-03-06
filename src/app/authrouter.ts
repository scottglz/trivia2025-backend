import { json, Response, Request } from 'express';
import routerMaker from 'express-promise-router';
import axios from 'axios';
import { config } from './config';
import * as jwt from 'jsonwebtoken';
import RestError from './resterror';
import * as loginTokens from './logintokens';
import Mailgun from 'mailgun.js';
import { dateToDayString, userFull } from '@scottglz/trivia2025-shared';
import cookieParser from 'cookie-parser';
import * as querystring from 'querystring';
import { TriviaStorage } from './storage';

const JWT_SECRET = config.JWT_SECRET;

const router = routerMaker();
const storage = config.storage as TriviaStorage;
const mailgunApp = new Mailgun(FormData);

const mailgunClient = mailgunApp.client({
   username: 'api',
   key: config.mailgun.apiKey
});

const matchesUserEmail = (email: string) => (user: userFull) => user.email === email;
const matchesUserId = (userid: number) => (user: userFull) => user.userid === userid;

function afterUserAuthenticated(userid: number, res: Response) {
   const webTokenPayload = {
      userid: userid
   };
   const webToken = jwt.sign(webTokenPayload, JWT_SECRET, {expiresIn: '365d'});
   res.cookie(JWT_COOKIE, webToken, {httpOnly: true, sameSite: true, maxAge: 1000*60*60*24*30});
   res.redirect('/');
}

function verifyJwt(webTokenEncoded: string, secret: string) {
   return new Promise<jwt.JwtPayload>(function(resolve, reject) {
      jwt.verify(webTokenEncoded, secret, async function(err, decoded) {
         if (err) {
            reject(new RestError(401, 'Bad or Expired Web Token'));
         }
         else {
            resolve(decoded as jwt.JwtPayload);
         }
      });
   });
}

router.use(json());
router.use(cookieParser());

const JWT_COOKIE = 'djywhxk';

interface RequestPlus extends Request {
   user?: userFull
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use(async function(req: RequestPlus, _res) {
   const jwtCookieVal = req.cookies[JWT_COOKIE];
   if (jwtCookieVal) {
      const jwt = await verifyJwt(jwtCookieVal, JWT_SECRET);
      const userid = jwt.userid;
      const user = (await storage.getUsers()).find(matchesUserId(userid));
      if (!user) {
         console.log('unknown user');
         console.log(JSON.stringify(await storage.getUsers()));
         throw new RestError(401, 'Unknown User');
      }
      req.user = user;
   }
   return Promise.resolve('next');
});

router.post('/api/logout', async function(req, res) {
   res.clearCookie(JWT_COOKIE);
   res.json(true);
});

router.post('/api/requestemailsignin', async function(request, response) {
   const email = request.body.email.trim();
   if (!email) {
      throw new RestError(400, 'Invalid email address');
   }

   const user = (await storage.getUsers()).find(matchesUserEmail(email));

   if (!user) {
      throw new RestError(400, `There is no user with the email address "${email}".`);
   }

   const token = loginTokens.generateToken(user.userid);

   const data = {
      from: config.mailFrom,
      to: email,
      subject: 'Trivia Login Magic Link',
      html: 
`
<p>
<a href="${config.baseUrl}/api/magiclink/${token}">Click here</a> to sign into the Trivia Server.
This link is only valid for five minutes from when this message was sent.
</p> 
`      
   };
   await mailgunClient.messages.create(config.mailgun.domain, data);
   response.json({ok: true});
});



router.get('/api/magiclink/:token([0-9a-fA-F]+)', async function(request, response) {
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

router.get('/api/slackredirect', async function(request, response) {
   const params = request.query;
   if (params.error) {
      throw new Error('Error from Slack: ' + params.error);
   }

   const code = params.code as string;
   const baseUrl = params.state;
   const redirect_uri = baseUrl + '/api/slackredirect';

   if (code) {
      const slackresponse = await axios.get('https://slack.com/api/oauth.access?' +
         querystring.stringify({
            client_id: '456894231392.459012826326',
            client_secret: config.SLACK_OATH_SECRET,
            code: code,
            redirect_uri: redirect_uri
         })
      );

      let slackUser = slackresponse.data.user;
      if (!slackUser) {
         const accessToken = slackresponse.data.access_token;
         if (!accessToken) {
            throw new Error('No User and No Access Token: ' + JSON.stringify(slackresponse));
         }
         const nextResponse = await axios.get('https://slack.com/api/users.identity?token=' + accessToken);
         slackUser = nextResponse.data.user;
         if (!slackUser) {
            throw new Error('STILL no slackUser?');
         }
      }
      
      // Get our userid from that slack info, like slackresponse.user.email
      const email = slackUser.email;
      let user = (await storage.getUsers()).find(matchesUserEmail(email));
      if (!user) {
         user = await storage.createUser(slackUser.name, slackUser.email, dateToDayString(new Date()));
      }
      afterUserAuthenticated(user.userid, response);
   }
   else {
      response.render('page.html', {
         message: 'Something went wrong, sorry. :-/'
      });
   }
});

export default router;