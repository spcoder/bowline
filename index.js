var http = require('http');
var path = require('path');
var url = require('url');
var fs = require('fs');
var mime = require('mime');
var findit = require('findit');
var jade = require('jade');
var consolidate = require('consolidate');
var merge = require('merge');

var PUBLIC_DIR = path.join(process.cwd(), 'public');
var CONTROLLER_DIR = path.join(process.cwd(), 'controllers');
var VIEW_DIR = path.join(process.cwd(), 'views');
var TEMPLATE_FUNCTION = consolidate.swig;
var ROUTES = {};

process.on('uncaughtException', function(err) {
  console.error(err.stack);
});

exports.templateFunction = function(fn) {
  TEMPLATE_FUNCTION = fn;
  return this;
};

exports.startServer = function(port, callback) {
  loadControllers(function() {
    var app = http.createServer(requestHandler);
    app.on('error', errorHandler);
    app.on('listening', listenHandler(app, port, callback));
    app.listen(port);
  });
  return this;
};

var loadControllers = function(callback) {
  var finder = findit(CONTROLLER_DIR);
  finder.on('file', controllerFileFoundHandler);
  finder.on('error', errorHandler);
  finder.on('end', function() {
    callback();
  });
};

var controllerFileFoundHandler = function(file, stat) {
  var ext = path.extname(file);
  if (ext === '.js') {
    console.log('found controller at', file);
    var controllerName = path.basename(file, '.js');
    var controller = require(file);
    console.log('  actions:');
    for (var actionName in controller) {
      console.log('    -', actionName);
      var uri = controllerName + '/' + actionName;
      ROUTES[uri] = controller[actionName]; 
    }
  }
};

var errorHandler = function(err) {
  console.error(err.stack);
};

var listenHandler = function(app, port, callback) {
  return function() {
    console.log('Listening on port', port);
    if (callback) callback(app);
  };
};

var requestHandler = function(req, res) {
  parseRequest(req, function(request) {
    if (request.isStatic) {
      serveFile(request.filename, res);
    } else if (request.isDynamic) {
      serveDynamic(request.controllerName, request.actionName, request.params, request.action, req, res);
    } else {
      serveNotFound(res);
    }
  });  
};

var parseRequest = function(req, callback) {
  var uri = url.parse(req.url);
  isStatic(uri, function(exists, filename) {
    if (exists) {
      callback({ isStatic: true, filename: filename });
    } else {
      isDynamic(req, uri, function(itIs, controllerName, actionName, params, action) {
        if (itIs) {
          callback({ isStatic: false, isDynamic: true, controllerName: controllerName, actionName: actionName, params: params, action: action });
        } else {
          callback({ isStatic: false, isDynamic: false });
        }
      });
    }
  });
};

var isStatic = function(uri, callback) {
  var pathname = uri.pathname === '/' ? '/index.html' : uri.pathname;
  var filename = path.join(PUBLIC_DIR, decodeURIComponent(pathname));
  fs.exists(filename, function(exists) {
    callback(exists, filename);
  });
};

var isDynamic = function(req, uri, callback) {
  var pathname = uri.pathname === '/' ? 'root/index' : uri.pathname;
  var actionDef = ROUTES[pathname];
  var action = undefined;
  if (actionDef) {
    action = actionDef[req.method.toLowerCase()];
  }
  if (action) {
    var pathSplit = pathname.split('/');
    var controllerName = pathSplit[0];
    var actionName = pathSplit[1];
    var params = pathSplit.slice(1);
    callback(true, controllerName, actionName, params, action);
  } else {
    callback(false);
  }
};

var Action = function(req, res, controllerName, actionName, params, actionFn) {
  this.method = req.method.toLowerCase();
  this.isGet = this.method === 'get';
  this.isPost = this.method === 'post';
  this.req = req;
  this.res = res;
  this.controllerName = controllerName;
  this.actionName = actionName;
  this.params = params;
  this.actionFn = actionFn;
  this.get = function(fn) {
    if (this.isGet) fn.call(this);
  };
  this.post = function(fn) {
    if (this.isPost) fn.call(this);
  };
  this.render = function(filepath, locals, statusCode, headers) {
    var res = this.res;
    var filepath = path.join(VIEW_DIR, filepath);
    var locals = locals || {};
    var statusCode = statusCode || 200;
    var headers = merge({ 'Content-Type': 'text/html' }, ( headers || {} ));
    TEMPLATE_FUNCTION(filepath, locals, function(err, html) {
      if (err) {
        serveError(err, res);
      } else {
        res.writeHead(statusCode, headers);
        res.write(html);
        res.end();
      }
    })
  }
};

var serveError = function(err, res) {
  errorHandler(err);
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.write('Internal Server Error\n');
  res.end();
};

var serveDynamic = function(controllerName, actionName, params, actionFn, req, res) {
  try {
    actionFn.call(new Action(req, res, controllerName, actionName, params, actionFn));
  } catch(ex) {
    console.error(ex.stack);
  }
};

var serveFile = function(filename, res) {
  try {
    var mimeType = mime.lookup(filename);
    res.writeHead(200, { 'Content-Type': mimeType });
    fs.createReadStream(filename).pipe(res);
  } catch(ex) {
    console.error(ex.stack);
  }
};

var serveNotFound = function(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.write('Not found\n');
  res.end();
};
