var path = require('path');
var consolidate = require('consolidate');
var logger = require('./logger');

var environment = process.env.NODE_ENV || 'development';

module.exports = {
  environment: environment,
  publicDir: path.join(process.cwd(), 'public'),
  controllerDir: path.join(process.cwd(), 'controllers'),
  viewDir: path.join(process.cwd(), 'views'),
  templateFn: consolidate.swig,
  logger: new logger.StandardLogger(environment)
};