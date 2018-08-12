const SCWorker = require('socketcluster/scworker');
const express = require('express');
const fs = require('fs');
const serveStatic = require('serve-static');
const path = require('path');
const morgan = require('morgan');
const healthChecker = require('sc-framework-health-check');
const parser = require('ua-parser-js');

// create a stdout and file logger
const UsageLogger = require('simple-node-logger');
const usageopts = {
  logFilePath: 'videochat.log',
  timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
};
const log = UsageLogger.createSimpleLogger(usageopts);

const AgentLogger = require('simple-node-logger');
const accessoptions = {
  logFilePath: 'useragent.log',
  timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
};
const ua = AgentLogger.createSimpleLogger(accessoptions);

class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID: ', process.pid);
    const environment = this.options.environment;

    const app = express();

    app.get('/', (req, res, next) => {
      const result = parser(req.headers['user-agent']);
      ua.info(result);
      ua.info('browser: ', result.browser); // {name: "Chromium", version: "15.0.874.106"}
      ua.info('device: ', result.device); // {model: undefined, type: undefined, vendor: undefined}
      ua.info('os: ', result.os); // {name: "Ubuntu", version: "11.10"}
      ua.info('os.version: ', result.os.version); // "11.10"
      ua.info('engine.name: ', result.engine.name); // "WebKit"
      ua.info('cpu.architecture: ', result.cpu.architecture);
      ua.info('-----------------------');
      next();
    });

    app.get('/mobile.html', (req, res, next) => {
      const result = parser(req.headers['user-agent']);
      ua.info('----Mobile Page--------');
      ua.info(result);
      ua.info('browser: ', result.browser); // {name: "Chromium", version: "15.0.874.106"}
      ua.info('device: ', result.device); // {model: undefined, type: undefined, vendor: undefined}
      ua.info('os: ', result.os); // {name: "Ubuntu", version: "11.10"}
      ua.info('os.version: ', result.os.version); // "11.10"
      ua.info('engine.name: ', result.engine.name); // "WebKit"
      ua.info('cpu.architecture: ', result.cpu.architecture);
      ua.info('-----------------------');
      next();
    });

    // create a write stream (in append mode)
    const accessLogStream = fs.createWriteStream(
      path.join(__dirname, 'access.log'),
      { flags: 'a' },
    );
    const clientsList = [];

    const httpServer = this.httpServer;
    const scServer = this.scServer;

    if (environment === 'dev') {
      // Log every HTTP request. See https://github.com/expressjs/morgan for other
      // available formats.
      app.use(morgan('dev'));
      app.use(morgan('combined', { stream: accessLogStream }));
    }

    app.use(serveStatic(path.resolve(__dirname, '../public')));

    httpServer.on('request', app);

    scServer.on('connection', server => {
      log.info('User connected');
      log.info('clients connected are', Object.keys(scServer.clients));
      log.info('id: ', server.id);

      scServer.exchange.publish(
        'clientsConnected',
        Object.keys(scServer.clients),
      );

      server.on('msg', message => {
        log.info('client said: ', message);
        const data = {
          id: server.id,
          msg: message,
        };
        scServer.exchange.publish('messagebroadcast', data);
      });

      // server.on('got user media', room);

      server.on('create or join', room => {
        log.info(`Received request to create or join room ${room}`);

        const numClients = scServer.clientsCount;
        log.info(`Room ${room} now has ${numClients}client(s)`);

        if (numClients === 1) {
          server.emit('askClientToSubscribe', room); // socket.join(room);
          log.info(`Client ID ${server.id} created room ${room}`);
          server.emit('created', room);
        } else if (numClients >= 2) {
          log.info(`Client ID ${server.id} joined room ${room}`);
          const data = {
            id: server.id,
            room,
          };
          scServer.exchange.publish('join', data); // io.sockets.in(room).emit('join', room);
          server.emit('askClientToSubscribe', data.room); // socket.join(room);
          server.emit('joined', Object.keys(scServer.clients));
        }
      });

      server.on('offer', data => {
        log.info('offer ', data);
        scServer.exchange.publish('offer', data);
      });

      server.on('answer', data => {
        log.info('answer ', data);
        scServer.exchange.publish('answer', data);
      });

      server.on('iceAnswer', data => {
        log.info('iceAnswer ', data);
        scServer.exchange.publish('iceAnswer', data);
      });

      server.on('iceOffer', data => {
        log.info('iceOffer ', data);
        scServer.exchange.publish('iceOffer', data);
      });

      server.on('bye', () => {
        log.info('received bye');
      });

      server.on('chat', data => {
        scServer.exchange.publish('yell', data);
        console.log('Chat: ', data);
      });

      server.on('filemetadata', data => {
        scServer.exchange.publish('filemetadata', data);
        console.log('filemetadata: ', data);
      });

      server.on('filesentnotify', data => {
        scServer.exchange.publish('filesentnotify', data);
        console.log('filesentnotify: ', data);
      });

      server.on('disconnect', () => {
        log.info('User disconnected ', server.id);
        log.info('disconnection ', Object.keys(scServer.clients));
        scServer.exchange.publish(
          'clientsDisconnect',
          Object.keys(scServer.clients),
        );
        scServer.exchange.publish('removeVideo', server.id);
      });
    });
  }
}

new Worker();
