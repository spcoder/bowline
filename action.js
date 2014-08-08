var path = require('path');
var merge = require('merge');
var events = require('events');
var util = require('util');
var settings = require('./settings');

var Action = exports.Action = function(req, res, pathname) {
  var pathSplit = pathname.split('/');
  this.controllerName = pathSplit[0];
  this.actionName = pathSplit[1];
  this.params = pathSplit.slice(1);

  this.method = req.method.toUpperCase();
  this.isGet = this.method === 'GET';
  this.isPost = this.method === 'POST';
  this.isPut = this.method === 'PUT';
  this.isDelete = this.method === 'DELETE';

  this.tracker = req.tracker;
  this.timestamp = req.timestamp;
  
  this.req = req;
  this.res = res;

  addLogMethods.call(this);

};

util.inherits(Action, events.EventEmitter);

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
  var locals = locals || {};
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