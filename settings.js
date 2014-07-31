var path = require('path');
var consolidate = require('consolidate');

module.exports = {
  publicDir: path.join(process.cwd(), 'public'),
  controllerDir: path.join(process.cwd(), 'controllers'),
  viewDir: path.join(process.cwd(), 'views'),
  templateFn: consolidate.swig
};