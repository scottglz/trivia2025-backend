import * as crypto from 'crypto';

interface record {
   userid: number,
   created: number
}

const records: {[token: string]: record} = {};

export function generateToken(userid: number) {
   const token = crypto.randomBytes(64).toString('hex');
   const record = {
      userid: userid,
      created: new Date().getTime()
   };
   records[token] = record;
   return token;
}

function cullOldTokens() {
   const millisNow = new Date().getTime();
   const millisFiveMinutesAgo = millisNow - (5 * 60 * 1000);
   Object.keys(records).forEach(key => {
      if (records[key].created < millisFiveMinutesAgo) {
         delete records[key];
      }
   });
}

export function checkToken(token: string) {
   //cullOldTokens();
   const ret = records[token];
   //delete records[token];
   return ret;
}

export function getAllTokensDebugInfo() {
   return JSON.stringify(records);
}
