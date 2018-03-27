var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');

class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID:', process.pid);
    var environment = this.options.environment;
    var app = express();

    var httpServer = this.httpServer;
    var scServer = this.scServer;

    if (environment === 'dev') {
      // Log every HTTP request. See https://github.com/expressjs/morgan for other
      // available formats.
      app.use(morgan('dev'));
    }

    app.use(serveStatic(path.resolve(__dirname, 'public')));

    httpServer.on('request', app);

    var clientsList = [];
    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    scServer.on('connection', function (server) {
      console.log('User connected');
      console.log('clients connected are', Object.keys(scServer.clients));
      console.log('id: ', server.id);

      scServer.exchange.publish('clientsConnected', Object.keys(scServer.clients));

      server.on('msg', function (message) {
        console.log('client said: ', message);
        var data = {
          id : server.id,
          msg : message
        };
        scServer.exchange.publish('messagebroadcast', data);
      });

      server.on('create or join', function(room){
        console.log('Received request to create or join room ' +room);

        var numClients = scServer.clientsCount;
        console.log('Room ' + room + ' now has ' + numClients + 'client(s)');

        if(numClients === 1) {
          server.emit('askClientToSubscribe', room); //socket.join(room);
          console.log('Client ID '+ server.id +' created room ' + room);
          server.emit('created', room);
        } else if (numClients >= 2){
          console.log('Client ID '+ server.id +' joined room ' + room);
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
        console.log('offer ', data);
        scServer.exchange.publish('offer', data);
      });

      server.on('answer', function(data) {
        console.log('answer ',data);
        scServer.exchange.publish('answer', data);
      });

      server.on('iceAnswer', function(data) {
        console.log('iceAnswer ',data);
        scServer.exchange.publish('iceAnswer', data);
      });

      server.on('iceOffer', function(data) {
        console.log('iceOffer ',data);
        scServer.exchange.publish('iceOffer', data);
      });

      server.on('disconnect', function () {
        console.log('User disconnected ', server.id);
        console.log('disconnection ',Object.keys(scServer.clients));
        scServer.exchange.publish('clientsDisconnect', Object.keys(scServer.clients));
        scServer.exchange.publish('removeVideo', server.id);
      });

      server.on('bye', function () {
        console.log('received bye');
      })

    });

  }
}


new Worker();
