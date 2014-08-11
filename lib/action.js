var path = require('path');
var merge = require('merge');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var qs = require('querystring');
var settings = require('./settings');
var Form = require('./form').Form;

var Action = exports.Action = function(req, res, uri) {
  var self = this;

  var pathSplit = uri.pathname.split('/'); // 0 = root slash (ie - /root/index)
  self.controllerName = pathSplit[1];
  self.actionName = pathSplit[2];
  
  self.params = pathSplit.slice(3);
  self.query = qs.parse(uri.query);
  self.form = new Form();

  self.method = req.method.toUpperCase();
  self.isGet = self.method === 'GET';
  self.isPost = self.method === 'POST';
  self.isPut = self.method === 'PUT';
  self.isDelete = self.method === 'DELETE';

  self.tracker = req.tracker;
  self.timestamp = req.timestamp;
  
  self.req = req;
  self.res = res;

  addLogMethods.call(self);

  process.nextTick(function() {
    if (self.isPost || self.isPut) {
      parseBody.call(self);
    } else {
      self.emit('ready');
    }  
  });

};

util.inherits(Action, EventEmitter);

var parseBody = function() {
  var self = this;
  var body = '';
  self.req.on('data', function(chunk) {
    body += chunk;
    if (body.length > 1e6) {
      self.req.connection.destroy();
    }
  });
  self.req.on('error', function(err) {
    self.emit('error', err);
  });
  self.req.on('end', function() {
    self.form = new Form(qs.parse(body));
    self.emit('ready');
  });
};

var addLogMethods = function() {
  var self = this;

  ['profile', 'startTimer'].forEach(function (method) {
    self[method] = function() {
      return settings.logger[method].apply(settings.logger, arguments);
    };
  });

  ['log'].concat(Object.keys(settings.logger.__logger__.levels)).forEach(function(method) {
    self[method] = function() {
      var args = Array.prototype.slice.call(arguments, 0);
      while(args[args.length - 1] === null) {
        args.pop();
      }
      var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
      var meta = typeof args[args.length - 1] === 'object' ? args.pop() : {};
      var msg  = '  ' + util.format.apply(null, args);

      meta = merge({ tracker: self.req.tracker }, meta);
      
      return settings.logger[method].apply(settings.logger, [msg, meta, callback]);
    };
  });

};

Action.prototype.render = function(filepath, locals, statusCode, headers) {
  var self = this;
  var res = this.res;
  var fullfile = path.join(settings.viewDir, filepath);
  var locals = merge(locals, { cache: false, action: self }) || { cache: false, action: self };
  var statusCode = statusCode || 200;
  var headers = merge({ 'Content-Type': 'text/html' }, ( headers || {} ));
  settings.templateFn(fullfile, locals, function(err, html) {
    if (err) {
      throw err;
    } else {
      res.writeHead(statusCode, headers);
      res.write(html);
      res.end();
      self.logRender(filepath, headers);
      self.emit('end');
    }
  });
};

Action.prototype.logRender = function(filepath, headers) {
  this.debug(('view: ' + filepath).grey);
  this.silly(('headers: ' + util.inspect(headers)).grey);
};