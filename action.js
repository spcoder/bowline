var path = require('path');
var merge = require('merge');
var events = require('events');
var util = require('util');
var settings = require('./settings');

var Action = function(req, res, pathname) {
  var self = this;

  var pathSplit = pathname.split('/');
  this.controllerName = pathSplit[0];
  this.actionName = pathSplit[1];
  this.params = pathSplit.slice(1);

  this.method = req.method.toUpperCase();
  this.isGet = this.method === 'GET';
  this.isPost = this.method === 'POST';
  this.isPut = this.method === 'PUT';
  this.isDelete = this.method === 'DELETE';
  
  this.req = req;
  this.res = res;

  var log = function(level, args) {
    var args = Array.prototype.slice.call(args);
    var lastArg = args[args.length - 1];
    if (lastArg != null && typeof lastArg === 'object') {
      lastArg['tracker'] = this.req.tracker;
      args[args.length - 1] = lastArg;
    } else {
      args.push({ tracker: this.req.tracker });
    }
    settings.logger[level].apply(this, args);
  };

  this.fatal = function() {
    log.call(this, 'fatal', arguments);
  };

  this.error = function() {
    log.call(this, 'error', arguments);
  };

  this.warn = function() {
    log.call(this, 'warn', arguments);
  };

  this.info = function() {
    log.call(this, 'info', arguments);
  };

  this.debug = function() {
    log.call(this, 'debug', arguments);
  };

  this.trace = function() {
    log.call(this, 'trace', arguments);
  };
  
  this.render = function(filepath, locals, statusCode, headers) {
    var res = this.res;
    var filepath = path.join(settings.viewDir, filepath);
    var locals = locals || {};
    var statusCode = statusCode || 200;
    var headers = merge({ 'Content-Type': 'text/html' }, ( headers || {} ));
    settings.templateFn(filepath, locals, function(err, html) {
      if (err) {
        throw err;
      } else {
        res.writeHead(statusCode, headers);
        res.write(html);
        res.end();
        self.emit('end');
      }
    });
  };

};

util.inherits(Action, events.EventEmitter);

exports.Action = Action;