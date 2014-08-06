var winston = require('winston');
var util = require('util');
var colors = require('colors');

var Console = exports.Console = function(options) {
  this.name = 'console';
};

util.inherits(Console, winston.Transport);

Console.prototype.levelColors = {
  silly: 'blue',
  debug: 'blue',
  verbose: 'green',
  info: 'green',
  warn: 'yellow',
  error: 'red'
};

Console.prototype.log = function (level, msg, meta, callback) {
  var output;
  var color = this.levelColors[level];

  if (msg) {
    output = util.format('%s: %s', level[color], msg.grey);
  } else if (meta.hasOwnProperty('type')) {
    if (meta.type === 'REQ') {
      output = util.format('%s: %s - %s', level[color], meta.method, meta.url);
    } else if (meta.type === 'RES') {
      // response output
    }
  }

  if (level === 'error' || level === 'debug') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }

  this.emit('logged');
  return callback(null, true);
};