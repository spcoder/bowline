var path = require('path');
var mime = require('mime');
var fs = require('fs');
var domain = require('domain');
var url = require('url');
var EventEmitter = require('events').EventEmitter;
var uuid = require('node-uuid');
var settings = require('./settings');
var logger = settings.logger;
var Action = require('./action').Action;

var JSEXT = '.js';
var STATIC = 'static';
var DYNAMIC = 'dynamic';
var BAD_REQUEST = 'badRequest';
var NOT_FOUND = 'notFound';
var ERROR = 'error';
var STATUS_SUCCESS = 200;
var STATUS_ERROR = 500;
var STATUS_NOT_FOUND = 404;
var STATUS_BAD_REQUEST = 400;

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

var requestHandler = function(req, res) {
  logger.logRequest(req, res);
  parser(req).on(STATIC, function(filepath) {
    serveStatic(req, res, filepath);
  }).on(DYNAMIC, function(pathname, action) {
    serveDynamic(req, res, pathname, action);
  }).on(NOT_FOUND, function() {
    serveNotFound(req, res);
  }).on(BAD_REQUEST, function() {
    serveBadRequest(req, res);
  }).on(ERROR, function(err) {
    serveInternalServerError(req, res, err);
  });
};

var errorHandler = function(req, res) {
  return function(err) {
    console.error(err.stack);
    serveInternalServerError(req, res, err);
  };
};

var clusterErrorHandler = function(cluster, app) {
  return function(req, res) {
    return function(err) {
      errorHandler(req, res)(err);
      app.close();
      cluster.worker.disconnect();
    };
  };
};

var addTracker = function(req) {
  req['tracker'] = uuid.v4();
};

var addTimestamp = function(req) {
  req['timestamp'] = new Date();
}

var extendRequest = function(req) {
  addTracker(req);
  addTimestamp(req);
};

exports.route = function(errorFn) {
  var errorFn = errorFn || errorHandler;
  return function(req, res) {
    extendRequest(req);
    var d = domain.create();
    d.add(req);
    d.add(res);
    d.on('error', errorFn(req, res));
    d.run(function() {
      requestHandler(req, res);
    });
  }
};

exports.clusterRoute = function(cluster, app) {
  return route(clusterErrorHandler(cluster, app));
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
      emitter.emit(BAD_REQUEST);
    }
  } else {
    emitter.emit(NOT_FOUND)
  }
};

var serveStatic = function(req, res, filepath) {
  res.writeHead(STATUS_SUCCESS, { 'Content-Type': mime.lookup(filepath) });
  fs.createReadStream(filepath).pipe(res);
  logger.logResponse(req, res);
};

var serveDynamic = function(req, res, pathname, fn) {
  var action = new Action(req, res, pathname);
  action.on('end', function() {
    logger.logResponse(req, res);
  });
  fn.apply(action, action.params);
};

var serveInternalServerError = function(req, res, err) {
  res.writeHead(STATUS_ERROR, { 'Content-Type': 'text/plain' });
  res.write('Internal Server Error\n');
  res.end();
  logger.logResponse(req, res, err);
};

var serveNotFound = function(req, res) {
  res.writeHead(STATUS_NOT_FOUND, { 'Content-Type': 'text/plain' });
  res.write('Not found\n');
  res.end();
  logger.logResponse(req, res);
};

var serveBadRequest = function(req, res) {
  res.writeHead(STATUS_BAD_REQUEST, { 'Content-Type': 'text/plain' });
  res.write('Bad Request\n');
  res.end();
  logger.logResponse(req, res);
};