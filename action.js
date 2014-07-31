var path = require('path');
var merge = require('merge');
var settings = require('./settings');

var Action = function(req, res, pathname) {
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
  
  this.get = function(fn) {
    if (this.isGet) fn.apply(this, this.params);
  };
  
  this.post = function(fn) {
    if (this.isPost) fn.apply(this, this.params);
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
      }
    });
  };

};

exports.Action = Action;