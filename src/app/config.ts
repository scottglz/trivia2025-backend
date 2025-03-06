import { CachingStorage, PgStorage } from './storage';


const env = (name: string, defaultValue?: string): string => {

   const value = process.env[name];
   if (!value && typeof defaultValue === 'undefined') {
      throw new Error(`Missing required environment variable: ${name}`);
   }
   return value ?? defaultValue!;
}

const pgOptions = {
   user: env('POSTGRES_USER'),
   host: env('POSTGRES_HOST'),
   database: env('POSTGRES_DATABASE'),
   password: env('POSTGRES_PASSWORD'),
   port: +env('POSTGRES_PORT', '5432')
};

export const config = {
   production: true,
   pgOptions: pgOptions,
   baseUrl: env('BASE_URL'),
   storage: new CachingStorage(new PgStorage(pgOptions)),
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
