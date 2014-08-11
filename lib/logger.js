var path = require('path');
var winston = require('winston');
var transports = require('./transports');

var StandardLogger = exports.StandardLogger = function(logLevel, filename) {

  this.__logger__ = new winston.Logger({
    transports: [
      new transports.ConsoleLight({ 
        level: logLevel
      }),
      new winston.transports.DailyRotateFile({
        level: logLevel,
        datePattern: '.yyyy-MM-dd',
        filename: path.join('log', filename),
        maxFiles: 10
      })
    ]
  }).extend(this);

};

StandardLogger.prototype.level = function(logLevel) {
  if (logLevel) {
    this.__logger__.transports.console.level = logLevel;
    this.__logger__.transports.dailyRotateFile.level = logLevel;
  } else {
    return this.__logger__.transports.console.level;
  }
};
