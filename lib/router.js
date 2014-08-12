var path = require('path');
var mime = require('mime');
var fs = require('fs');
var domain = require('domain');
var url = require('url');
var EventEmitter = require('events').EventEmitter;
var uuid = require('node-uuid');
var async = require('async');
var bowline = require('./bowline');
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
  logRequest(req, res);
  var uri = url.parse(req.url);
  isStatic(uri, function(exists, filepath) {
    if (exists) {
      serveStatic(req, res, filepath)
    } else {
      isDynamic(uri, req.method, function(type, beforeFnArr, actionFn) {
        switch(type) {
          case DYNAMIC:
            serveDynamic(req, res, uri, beforeFnArr, actionFn);
            break;
          case NOT_FOUND:
            serveNotFound(req, res);
            break;
          case BAD_REQUEST:
            serveBadRequest(req, res);
            break;
        }
      });
    }
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

var isStatic = function(uri, callback) {
  var pathname = uri.pathname === '/' ? '/index.html' : uri.pathname;
  var filepath = path.join(settings.publicDir, decodeURIComponent(pathname));
  fs.exists(filepath, function(exists) {
    if (callback) {
      callback(exists, filepath);
    }
  });
};

var isDynamic = function(uri, method, callback) {
  uri.pathname = (uri.pathname === '/') ? '/root/index' : uri.pathname;
  var controllerAction = uri.pathname.split('/').slice(1, 3).join('/');

  var actionDef = _routes[controllerAction];
  if (actionDef) {
    var actionFn = actionDef[method.toLowerCase()];
    var beforeFnArr = actionDef.before;
    if (actionFn) {
      callback(DYNAMIC, beforeFnArr, actionFn);
    } else {
      callback(BAD_REQUEST);
    }
  } else {
    callback(NOT_FOUND);
  }
};

var serveStatic = function(req, res, filepath) {
  res.writeHead(STATUS_SUCCESS, { 'Content-Type': mime.lookup(filepath) });
  fs.createReadStream(filepath).pipe(res);
  logResponse(req, res);
};

// returns an array of async compatible functions that will be called
// with the scope of the passed in action.
// in other words, async typically wants functions that have a single callback argument, but
// we need to invoke the middleware function with the scope of an action so that the middleware
// can be used similar to other actions. (ie, this.info(), this.controllerName, etc...)
var buildMiddlewareArray = function(action, beforeFnArr) {
  var middlewareArr = [];
  (beforeFnArr || []).forEach(function(middleware) {
    middlewareArr.push(function(callback) {
      middleware.call(action, callback);
    });
  });
  return middlewareArr;
};

var serveDynamic = function(req, res, uri, beforeFnArr, actionFn) {
  var action = new Action(req, res, uri);
  // an action is considered `ready` after it parses the request and body (if supplied)
  action.on('ready', function() {
    var middlewareArr = buildMiddlewareArray(action, beforeFnArr);
    async.series(middlewareArr, function(err, results) {
      if (err) {
        serveInternalServerError(req, res, err);
      } else {
        var finalResult = results.every(function(result) {
          return result === undefined || result === null || result === false;
        });
        if (finalResult) {
          console.log('calling action...');
          actionFn.apply(action, action.params);  
        } else {
          console.log('middleware handled');
        }
      }
    });
  });
  action.on('error', function(err) {
    serveInternalServerError(req, res, err);
  });
  action.on('end', function() {
    logResponse(req, res);
  });  
};

var serveInternalServerError = function(req, res, err) {
  res.writeHead(STATUS_ERROR, { 'Content-Type': 'text/plain' });
  res.write('Internal Server Error\n');
  res.end();
  logResponse(req, res, err);
};

var serveNotFound = function(req, res) {
  res.writeHead(STATUS_NOT_FOUND, { 'Content-Type': 'text/plain' });
  res.write('Not found\n');
  res.end();
  logResponse(req, res);
};

var serveBadRequest = function(req, res) {
  res.writeHead(STATUS_BAD_REQUEST, { 'Content-Type': 'text/plain' });
  res.write('Bad Request\n');
  res.end();
  logResponse(req, res);
};

var logRequest = function(req) {
  var meta = { 
    type: 'REQ', 
    method: req.method.toUpperCase(), 
    url: req.url, 
    pid: process.pid, 
    tracker: req.tracker 
  };
  logger.info(meta);
};

var logResponse = function(req, res, err) {
  var meta = { 
    type: 'RES',
    tracker: req.tracker,
    statusCode: res.statusCode, 
    duration: (new Date().getTime() - req.timestamp), 
  };
  logger.info(meta);
};