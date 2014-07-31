var cluster = require('cluster');
var http = require('http');
var os = require('os');
var router = require('./router');
var settings = require('./settings');

var numCPUs = os.cpus().length;

exports.templateFunction = function(fn) {
  settings.templateFn = fn;
};

exports.startServer = function(port, callback) {
  router.discover(function() {
    if (cluster.isMaster) {
      for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
      }
      cluster.on('fork', function(worker) {
        console.log('worker ' + worker.process.pid + ' was created.');
      });
      cluster.on('online', function(worker) {
        console.log('worker ' + worker.process.pid + ' is online');
      });
      cluster.on('listening', function(worker) {
        console.log('worker ' + worker.process.pid + ' is listening');
      });
      cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
      });
      cluster.on('disconnect', function(worker) {
        console.log('worker ' + worker.process.pid + ' disconnected');
        cluster.fork();
      });
    } else {
      var app = http.createServer();
      app.on('request', router.route(cluster, app));
      app.listen(port);
    }
  });
};