var path = require('path');
var consolidate = require('consolidate');
var StandardLogger = require('./logger').StandardLogger;

var environment = process.env.NODE_ENV || 'development';
var logLevel = 'info';
if (environment === 'development' || environment === 'test') {
  logLevel = 'debug';
}

module.exports = {
  environment: environment,
  publicDir: path.join(process.cwd(), 'public'),
  controllerDir: path.join(process.cwd(), 'controllers'),
  viewDir: path.join(process.cwd(), 'views'),
  templateFn: consolidate.swig,
  logger: new StandardLogger(logLevel, environment + '.log')
};