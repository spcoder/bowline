var path = require('path');
var mime = require('mime');
var fs = require('fs');
var domain = require('domain');
var url = require('url');
var EventEmitter = require('events').EventEmitter;
var settings = require('./settings');
var Action = require('./action').Action;

var JSEXT = '.js';
var STATIC = 'static';
var DYNAMIC = 'dynamic';
var INVALID_METHOD = 'invalidMethod';
var NOT_FOUND = 'notFound';
var ERROR = 'error';
var STATUS_SUCCESS = 200;

var _routes = {};

exports.discover = function(callback) {
  var finder = require('findit')(settings.controllerDir);
  finder.on('file', function(file, stat) {
    var ext = path.extname(file);
    if (ext === JSEXT) {
      var controllerName = path.basename(file, JSEXT);
      var controller = require(file);
      for (var actionName in controller) {
        _routes[controllerName + '/' + actionName] = controller[actionName]; 
      }
    }  
  });
  finder.on('error', function(err) {
    callback(err);
  });
  finder.on('end', function() {
    callback();
  });
};

exports.route = function(cluster, app) {
  return function(req, res) {
    var d = domain.create();
    d.add(req);
    d.add(res);
    d.on('error', function(err) {
      console.error(err.message);
      console.error(err.stack);
      app.close();
      cluster.worker.disconnect();
      serveInternalServerError(req, res, err);
    });
    d.run(function() {
      parser(req).on(STATIC, function(filepath) {
        serveStatic(req, res, filepath);
      }).on(DYNAMIC, function(pathname, action) {
        serveDynamic(req, res, pathname, action);
      }).on(NOT_FOUND, function() {
        serveNotFound(req, res);
      }).on(INVALID_METHOD, function() {
        serveBadRequest(req, res);
      }).on(ERROR, function(err) {
        serveInternalServerError(req, res, err);
      });
    });
  };
};

var parser = function(req) {
  var uri = url.parse(req.url);
  var emitter = new EventEmitter();
  process.nextTick(function() {
    isStatic(uri, emitter);
    isDynamic(uri, req.method, emitter);  
  });
  return emitter;
};

var isStatic = function(uri, emitter) {
  var pathname = uri.pathname === '/' ? '/index.html' : uri.pathname;
  var filepath = path.join(settings.publicDir, decodeURIComponent(pathname));
  fs.exists(filepath, function(exists) {
    if (exists) {
      emitter.emit(STATIC, filepath);
    }
  });
};

var isDynamic = function(uri, method, emitter) {
  var pathname = uri.pathname === '/' ? 'root/index' : uri.pathname;
  var actionDef = _routes[pathname];
  if (actionDef) {
    var action = actionDef[method.toLowerCase()];
    if (action) {
      emitter.emit(DYNAMIC, pathname, action);
    } else {
      emitter.emit(INVALID_METHOD);
    }
  } else {
    emitter.emit(NOT_FOUND)
  }
};

var serveStatic = function(req, res, filepath) {
  res.writeHead(STATUS_SUCCESS, { 'Content-Type': mime.lookup(filepath) });
  fs.createReadStream(filepath).pipe(res);
};

var serveDynamic = function(req, res, pathname, fn) {
  fn.call(new Action(req, res, pathname));
};

var serveInternalServerError = function(req, res, err) {
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.write('Internal Server Error\n');
  res.end();
};

var serveNotFound = function(req, res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.write('Not found\n');
  res.end();
};
