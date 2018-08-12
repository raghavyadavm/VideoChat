const SCWorker = require('socketcluster/scworker');
const express = require('express');
const fs = require('fs');
const serveStatic = require('serve-static');
const path = require('path');
const morgan = require('morgan');
const healthChecker = require('sc-framework-health-check');
const parser = require('ua-parser-js');

const START_EXCHANGE = 'app/SocketConnection/START_EXCHANGE';
const CONNECTED = 'app/SocketConnection/CONNECTED';
const CONNECTED_CLIENTS = 'app/SocketConnection/CONNECTED_CLIENTS';
const MESSAGE_BROADCAST = 'app/SocketConnection/MESSAGE_BROADCAST';
const OPEN_CHAT_CHANNEL = 'app/SocketConnection/OPEN_CHAT_CHANNEL';
const CREATED = 'app/SocketConnection/CREATED';
const JOIN = 'app/SocketConnection/JOIN';
const JOINED = 'app/SocketConnection/JOINED';
const OFFER = 'app/SocketConnection/OFFER';
const ANSWER = 'app/SocketConnection/ANSWER';
const ICE_OFFER = 'app/SocketConnection/ICE_OFFER';
const ICE_ANSWER = 'app/SocketConnection/ICE_ANSWER';
const CHAT_DATA = 'app/SocketConnection/CHAT_DATA';
const FILE_METADATA = 'app/SocketConnection/FILE_METADATA';
const FILE_SENT_NOTIFICATION = 'app/SocketConnection/FILE_SENT_NOTIFICATION';
const DISCONNECTED_CLIENTS = 'app/SocketConnection/DISCONNECTED_CLIENTS';
const REMOVE_VIDEO = 'app/SocketConnection/REMOVE_VIDEO';

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
  emitFunc(server, event, data) {
    server.emit(
      'events',
      {
        type: event,
        payload: data,
      },
      () => {
        console.log(`server emitted the ${event} event!`);
      },
    );
  }

  run() {
    console.log('   >> Worker PID: ', process.pid);
    const environment = this.options.environment;

    const app = express();

    const httpServer = this.httpServer;
    const scServer = this.scServer;

    app.use(serveStatic(path.resolve(__dirname, '../public')));

    httpServer.on('request', app);

    scServer.on('connection', server => {
      console.log('user connected');
      console.log('clients connected are ', Object.keys(scServer.clients));
      console.log('client id: ', server.id);

      this.emitFunc(server, CONNECTED, server.id);

      server.on('connectedClients', (data, res) => {
        console.log('connectedClients is ', data);
        res(null, data.type);
        scServer.exchange.publish('datachannel', {
          type: CONNECTED_CLIENTS,
          payload: Object.keys(scServer.clients),
        });
      });

      server.on('msg', (data, res) => {
        console.log('client said: ', message);
        const sendData = { id: server.id, msg: message };
        res(null, data.type);
        scServer.exchange.publish('datachannel', {
          type: MESSAGE_BROADCAST,
          payload: sendData,
        });
      });

      server.on('create or join', (data, res) => {
        console.log(`Received request to create or join room ${data.payload}`);

        const numClients = scServer.clientsCount;
        console.log(`Room ${data.payload} now has ${numClients}client(s)`);
        res(null, data.type);

        if (numClients === 1) {
          console.log('room has 1 client');

          // server.emit('askClientToSubscribe', room);
          this.emitFunc(server, OPEN_CHAT_CHANNEL, data.payload);

          console.log(`Client ID ${server.id} created room ${data.payload}`);
          // server.emit('created', room);
          this.emitFunc(server, CREATED, data.payload);
        } else if (numClients >= 2) {
          console.log(`client has now ${numClients} clients`);
          console.log(`Client ID ${server.id} joined room ${data.payload}`);

          scServer.exchange.publish('datachannel', {
            // scServer.exchange.publish('join', data);
            type: JOIN,
            payload: { id: server.id, room: data.payload },
          });

          // server.emit('askClientToSubscribe', room);
          this.emitFunc(server, OPEN_CHAT_CHANNEL, data.payload);

          // server.emit('joined', Object.keys(scServer.clients));
          this.emitFunc(server, JOINED, Object.keys(scServer.clients));
        }
      });

      server.on('disconnect', () => {

        console.log('User disconnected ', server.id);
        scServer.exchange.publish('datachannel', {
          type: DISCONNECTED_CLIENTS,
          payload: Object.keys(scServer.clients),
        });
        console.log('disconnection ', Object.keys(scServer.clients));
        // scServer.exchange.publish('clientsDisconnect', Object.keys(scServer.clients));
        // scServer.exchange.publish('removeVideo', server.id);
      });

      // server.on('offer', (data, res) => {
      //   console.log('offer ', data);
      //   res(null, data.type);
      //   scServer.exchange.publish('offer', data);
      //   scServer.exchange.publish('datachannel', {
      //     type: OFFER,
      //     payload: data.payload,
      //   });
      // });

      // server.on('dispatch',
      //   console.log('dispatch is ')
      //   // res(null, data.type);
      //   // socket.emit(data.type, data.payload);
      // );

      // scServer.exchange.publish('chat', {
      //   type: 'app/SocketConnection/EXCHANGE',
      //   payload: Object.keys(scServer.clients),
      // });

      // var interval = setInterval(function() {
      //   scServer.exchange.publish('chat', {
      //     type: 'app/SocketConnection/EXCHANGE',
      //     payload: Object.keys(scServer.clients),
      //   });
      // }, 2000);

      // scServer.exchange.publish('clientsConnected', {
      //   type: 'app/SocketConnection/CLIENTS_CONNECTED',
      //   payload: Object.keys(scServer.clients),
      // });

      // server.on('dispatch', (data, res) => {
      //   console.log('dispatch is ', data, res);
      //   res(null, data.type);
      //   // socket.emit(data.type, data.payload);
      // });

      // // server.emit('clientsConnected', {
      // //   type: 'app/SocketConnection/CLIENTS_CONNECTED',
      // //   payload: Object.keys(scServer.clients),
      // // });

      // server.on('msg', message => {
      //   console.log('client said: ', message);
      //   const data = {
      //     id: server.id,
      //     msg: message,
      //   };
      //   scServer.exchange.publish('messagebroadcast', data);
      // });

      // server.on('offer', data => {
      //   log.info('offer ', data);
      //   scServer.exchange.publish('offer', data);
      // });

      // server.on('answer', data => {
      //   log.info('answer ', data);
      //   scServer.exchange.publish('answer', data);
      // });

      // server.on('iceAnswer', data => {
      //   log.info('iceAnswer ', data);
      //   scServer.exchange.publish('iceAnswer', data);
      // });

      // server.on('iceOffer', data => {
      //   log.info('iceOffer ', data);
      //   scServer.exchange.publish('iceOffer', data);
      // });

      // server.on('bye', () => {
      //   log.info('received bye');
      // });

      // server.on('chat', data => {
      //   scServer.exchange.publish('yell', data);
      //   console.log('Chat: ', data);
      // });

      // server.on('filemetadata', data => {
      //   scServer.exchange.publish('filemetadata', data);
      //   console.log('filemetadata: ', data);
      // });

      // server.on('filesentnotify', data => {
      //   scServer.exchange.publish('filesentnotify', data);
      //   console.log('filesentnotify: ', data);
      // });

      // server.on('disconnect', () => {
      //   log.info('User disconnected ', server.id);
      //   log.info('disconnection ', Object.keys(scServer.clients));
      //   scServer.exchange.publish(
      //     'clientsDisconnect',
      //     Object.keys(scServer.clients),
      //   );
      //   scServer.exchange.publish('removeVideo', server.id);
      // });
    });
  }
}

new Worker();
