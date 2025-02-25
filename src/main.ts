import 'dotenv/config';
import { config } from './app/config';
import router from './app/restrouter';
import authrouter from './app/authrouter';
import express from 'express';
import { Server }  from 'http';
import RestError from './app/resterror';
import nocache from 'nocache';

const app = express();
const http = new Server(app);

app.use(nocache());

app.use(authrouter);
app.use('/trivia', router);

app.use(function (req, res) {
   res.status(404).send({status: 404, message: 'NOT_FOUND'});
});

interface ErrorRequestHandler {
   (err: unknown, req: express.Request, res: express.Response, next: express.NextFunction): void;
}

const errorHandler: ErrorRequestHandler = function (err, req, res, next) {
   if (err instanceof RestError) {
      res.status(err.status).send({status: err.status, message: err.message});
   }
   else {
      res.status(500).send({status: 500, message: '' + err});
   }
};

app.use(errorHandler);

const server = http.listen(config.port, function() {
   console.log('Server running on port ' + config.port);
});

server.on('error', console.error);


