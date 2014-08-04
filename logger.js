var path = require('path');
var util = require('util');
var winston = require('winston');

/*
  Any logger function must implement the following methods.

    fatal, error, warn, info, debug, trace

  Each method must accept the following signature.

    function(message, [...], [{...}])

    The first argument is a string that is either the full message, or a string with placeholders
    used for a `util.format` call.

    If more than one argument is provided, then the last argument is checked to see if it's an object.
    If it is an object, then the `tracker` property is pulled and used in the output.

    All other arguments are used for placeholder replacements in `util.format`.
*/
module.exports = {

  StandardLogger: function(environment, level) {

    var getLogLevel = function(level) {
      if (!level) {
        switch(environment){
          case 'development':
          case 'test':
            return 'debug';
          case 'qa':
          case 'staging':
            return 'info'
          case 'production':
          default:
            return 'error';
        }
      } else {
        return level;
      }
    };

    var logLevels = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };
    var logColors = { trace: 'yellow', debug: 'blue', info: 'green', warn: 'yellow', error: 'red', fatal: 'red' };

    var log = new winston.Logger({
      levels: logLevels,
      colors: logColors,
      transports: [
        new winston.transports.Console({ name: 'console', level: getLogLevel(level), colorize: true }),
        new winston.transports.DailyRotateFile({
          name: 'dailyRotate',
          level: getLogLevel(level),
          datePattern: '.yyyy-MM-dd',
          filename: path.join('log', environment + '.log'),
          maxFiles: 10
        })
      ]
    });

    var buildLogMessage = function() {
      var args = Array.prototype.slice.call(arguments);
      var date = new Date().toISOString();
      var pid = process.pid;
      var tracker = '--';

      // the first argument should be the message
      // remove it from the arguments list
      var msg = args.shift() || 'No message';

      // if the last argument is an object, then treat it as an `options` object
      var lastArgument = args[args.length - 1];
      if (lastArgument && lastArgument.hasOwnProperty('tracker')) {
        tracker = lastArgument.tracker || '--';
        args.pop();
      }  

      // if any arguments remain, then consider the `msg` to be a placeholder string
      // and use the `util` library to create a formatted string
      if (args.length > 0) {
        args.splice(0, 0, msg);
        msg = util.format.apply(this, args);
      }

      return util.format('\t %s [%s] [%s] - %s', date, pid, tracker, msg);
    };

    this.fatal = function() {
      log.fatal(buildLogMessage.apply(this, arguments));
    };

    this.error = function() {
      log.error(buildLogMessage.apply(this, arguments));
    };

    this.warn = function() {
      log.warn(buildLogMessage.apply(this, arguments));
    };

    this.info = function() {
      log.info(buildLogMessage.apply(this, arguments));
    };

    this.debug = function() {
      log.debug(buildLogMessage.apply(this, arguments));
    };

    this.trace = function() {
      log.trace(buildLogMessage.apply(this, arguments));
    };

    this.level = function(level) {
      if (level) {
        log.transports.console.level = level;
        log.transports.dailyRotate.level = level;
      } else {
        return log.transports.console.level;
      }
    }

  }

};