var SCWorker = require('socketcluster/scworker');
var express = require('express');
var fs = require('fs');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

// create a stdout and file logger
const log = require('simple-node-logger').createSimpleLogger('videochat.log');

class Worker extends SCWorker {
  run() {
    log.info('>> Worker PID: ', process.pid);
    var environment = this.options.environment;

    var app = express();

    // create a write stream (in append mode)
    var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
    var clientsList = [];

    var httpServer = this.httpServer;
    var scServer = this.scServer;

    if (environment === 'dev') {
      // Log every HTTP request. See https://github.com/expressjs/morgan for other
      // available formats.
      app.use(morgan('dev'));
      app.use(morgan('combined', {stream: accessLogStream}))
    }

    app.use(serveStatic(path.resolve(__dirname, 'public')));

    httpServer.on('request', app);

    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    scServer.on('connection', function (server) {
      log.info('User connected');
      log.info('clients connected are', Object.keys(scServer.clients));
      log.info('id: ', server.id);
      // clientsList.push(server.id);
      // log.info("list of clients", clientsList);

      scServer.exchange.publish('clientsConnected', Object.keys(scServer.clients));

      // log.info('clients count: ', scServer.clientsCount);

      server.on('msg', function (message) {
        log.info('client said: ', message);
        var data = {
          id : server.id,
          msg : message
        };
        scServer.exchange.publish('messagebroadcast', data);
      });

      //server.on('got user media', room);

      server.on('create or join', function(room){
        log.info('Received request to create or join room ' +room);

        var numClients = scServer.clientsCount;
        log.info('Room ' + room + ' now has ' + numClients + 'client(s)');

        if(numClients === 1) {
          server.emit('askClientToSubscribe', room); //socket.join(room);
          log.info('Client ID '+ server.id +' created room ' + room);
          server.emit('created', room);
        } else if (numClients >= 2){
          log.info('Client ID '+ server.id +' joined room ' + room);
          var data = {
            id : server.id,
            room : room
          };
          scServer.exchange.publish('join', data); //io.sockets.in(room).emit('join', room);
          //scServer.exchange.publish('isInitiator', data); //io.sockets.in(room).emit('join', room);
          server.emit('askClientToSubscribe', data.room); //socket.join(room);
          server.emit('joined', Object.keys(scServer.clients));
          //server.emit('full', room);
        }
      });

      server.on('offer', function(data) {
        log.info('offer ', data);
        scServer.exchange.publish('offer', data);
      });

      server.on('answer', function(data) {
        log.info('answer ',data);
        scServer.exchange.publish('answer', data);
      });

      server.on('iceAnswer', function(data) {
        log.info('iceAnswer ',data);
        scServer.exchange.publish('iceAnswer', data);
      });

      server.on('iceOffer', function(data) {
        log.info('iceOffer ',data);
        scServer.exchange.publish('iceOffer', data);
      });

      server.on('ipaddr', function() {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
          ifaces[dev].forEach(function(details) {
            if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
              server.emit('ipaddr', details.address);
            }
          });
        }
      });

      server.on('bye', function () {
        log.info('received bye');
      });

      server.on('chat', function (data) {
        scServer.exchange.publish('yell', data);
        console.log('Chat: ', data);
      });

      server.on('disconnect', function () {
        log.info('User disconnected ', server.id);
        // var index = clientsList.indexOf(server.id);
        // if (index !== -1) clientsList.splice(index, 1);
        // console.log('new clients list', clientsList);
        log.info('disconnection ',Object.keys(scServer.clients));
        scServer.exchange.publish('clientsDisconnect', Object.keys(scServer.clients));
        scServer.exchange.publish('removeVideo', server.id);
        // scServer.exchange.publish('yell', server.id+' got disconnected');
      });

      server.on('screenOffer', function(data) {
        log.info('screenOffer ', data);
        scServer.exchange.publish('screenOffer', data);
      });

      server.on('screenAnswer', function(data) {
        log.info('screenAnswer ',data);
        scServer.exchange.publish('screenAnswer', data);
      });

      server.on('screenIceAnswer', function(data) {
        log.info('screenIceAnswer ',data);
        scServer.exchange.publish('screenIceAnswer', data);
      });

      server.on('screenIceOffer', function(data) {
        log.info('screenIceOffer ',data);
        scServer.exchange.publish('screenIceOffer', data);
      });
    });
  }
}

new Worker();
