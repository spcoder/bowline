bowline
=======

a simple web microframework for node and stuff.


## installation

  **this module isn't available at [npm](http://npmjs.org) yet.**

    $ npm install bowline --save


## highlights

  * no routes
  * urls are mapped by `controller/action(/params)`
  * bring your own templating system or use [swig](http://paularmstrong.github.io/swig/) by default
  * logs with request tracking that automatically roll each day


##  api

### startServer(port, [callback])

  starts a server on `port` and calls the `callback` function when it's ready and listening.
  this is when all the controllers and actions are discovered by looking for `.js` files in a folder named
  `controllers` in the current working directory.

### templateFunction(fn)

  specify a function that will be used to render templates. the signature `fn(path, locals, callback)` is used.
  this is friendly for engines used with [consolidate](https://github.com/visionmedia/consolidate.js/).

### logger([logger])

  if no arguments are provided then this function will return the current logger object. otherwise, it will
  replace the current logger with the one provided in the arguments.


## why another web framework?

  i really enjoy the old-school ruby-on-rails routing which only used controllers and actions (controller/action).
  this enables developers to easily add new functionality, and it also helps other developers with mapping urls back to actual code.

  i also feel like most web frameworks for node are overkill for the projects that i'm working on. but, i also want a framework
  that can scale to a bigger project if needed.

  this is my attempt to increase productivity for many of the projects that i create.

  i hope it can help you too!

## license

  [MIT](LICENSE)