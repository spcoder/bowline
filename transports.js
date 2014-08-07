var winston = require('winston');
var util = require('util');
var colors = require('colors');

var Console = exports.Console = function(options) {
  this.name = 'console';
  this.suppressTracker = options.suppressTracker || true;
};

util.inherits(Console, winston.Transport);

Console.prototype.levelColors = {
  silly: 'magenta',
  debug: 'green',
  verbose: 'cyan',
  info: 'grey',
  warn: 'yellow',
  error: 'red'
};

Console.prototype.log = function (level, msg, meta, callback) {
  var output;
  var color = this.levelColors[level];

  if (msg) {
    output = util.format('%s', msg);
  } else if (meta.hasOwnProperty('type')) {
    if (meta.type === 'REQ') {
      if (this.suppressTracker) {
        output = util.format('\n-----------------------------\n%s %s', meta.method.toUpperCase(), meta.url);
      } else {
        output = util.format('\n-----------------------------\n%s %s | %s', meta.method.toUpperCase(), meta.url, meta.tracker);
      }
    } else if (meta.type === 'RES') {
      if (this.suppressTracker) {
        output = util.format('Responded with %d in %dms', meta.statusCode, meta.duration);
      } else {
        output = util.format('Responded with %d in %dms | %s', meta.statusCode, meta.duration(), meta.tracker);
      }
    }
  }

  var color = this.levelColors[level];

  if (level === 'error' || level === 'debug') {
    process.stderr.write(output[color] + '\n');
  } else {
    process.stdout.write(output[color] + '\n');
  }

  this.emit('logged');
  return callback(null, true);
};