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
  
  this.req = req;
  this.res = res;
  
  settings.logger.__logger__.extend(this);

};

util.inherits(Action, events.EventEmitter);

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
  this.debug('View   : %s', filepath);
  this.silly('Headers: %s', util.inspect(headers));
};