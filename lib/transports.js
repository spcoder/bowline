var winston = require('winston');
var util = require('util');
var colors = require('colors');

var ConsoleLight = exports.ConsoleLight = function(options) {
  this.name = 'console';
};

util.inherits(ConsoleLight, winston.Transport);

ConsoleLight.prototype.log = function (level, msg, meta, callback) {
  var output;

  if (msg) {
    output = util.format('%s', msg);
  } else if (meta.hasOwnProperty('type')) {
    var hr = new Array(50).join('-');
    switch(meta.type.toUpperCase()) {
      case 'START':
        output = util.format('%s\n%s %s\n%s', hr.grey, 'Listening on port'.grey, meta.port.toString().cyan, hr.grey);
        break;
      case 'REQ':
        output = util.format('%s %s', ('Request: ' + meta.method).grey, meta.url.grey);
        break;
      case 'RES':
        output = util.format('%s %s\n%s', 'Response: '.grey + meta.statusCode.toString().green, (meta.duration.toString() + 'ms').grey, hr.grey);
        break;
    }
  }

  if (output) {
    if (level === 'error' || level === 'debug') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  this.emit('logged');
  return callback(null, true);
};