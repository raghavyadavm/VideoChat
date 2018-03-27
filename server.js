/*
  This is the SocketCluster master controller file.
  It is responsible for bootstrapping the SocketCluster master process.
  Be careful when modifying the options object below.
  If you plan to run SCC on Kubernetes or another orchestrator at some point
  in the future, avoid changing the environment variable names below as
  each one has a specific meaning within the SC ecosystem.
*/

var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var scHotReboot = require('sc-hot-reboot');
var scErrors = require('sc-errors');
var TimeoutError = scErrors.TimeoutError;

var fsUtil = require('socketcluster/fsutil');
var waitForFile = fsUtil.waitForFile;

var SocketCluster = require('socketcluster');
const https = require('https');


var options = {
  workers: 1,
  brokers: 1,
  port: 8001,
  // If your system doesn't support 'uws', you can switch to 'ws' (which is slower but works on older systems).
  wsEngine: 'uws',
  appName: 'VideoChat',
  workerController:  __dirname + '/worker.js',
  brokerController:  __dirname + '/broker.js',
  socketChannelLimit: 1000,
  rebootWorkerOnCrash: true,
  protocol: 'https',
  protocolOptions: {
    key: fs.readFileSync(__dirname + '/key.pem', 'utf8'),
    cert: fs.readFileSync(__dirname + '/cert.pem', 'utf8')

  }
};

var socketCluster = new SocketCluster(options);
