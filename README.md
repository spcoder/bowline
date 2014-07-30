bowline
=======

a simple web microframework for node and stuff.


## installation

  npm install bowline --save


## highlights

  * no routes
  * urls are mapped by `controller/action(/params)`
  * bring your own templating system or use [swig](http://paularmstrong.github.io/swig/) by default


## getting started

### setup

with [node](http://nodejs.org/) installed, create a directory for your application

```shell
$ mkdir myapp
```

next, create a controllers folder

```shell
$ mkdir myapp/controllers
```

also, create the following view folders

```shell
$ mkdir myapp/views
$ mkdir myapp/views/layouts
$ mkdir myapp/views/root
```

### create a controller with an action

  when a request is made to the root of your application (`/`) it will be directed to a controller
  named root at `myapp/controllers/root.js'. create this file with the following contents.

  ```js
  exports.index = {
    get: function() {
      this.render('root/index.html', { msg: 'Hello World!' });
    }
  };
  ```

### create a base layout

  you'll want to create an html layout so you don't need to write header and footer code for every view.
  create a base layout at `myapp/views/layouts/layout.html' with the following contents.

  ```html
  <!doctype html>
  <html lang="en">
    <head>
      <title>MyApp</title>
    </head>
    <body>
      {% block content %}{% endblock %}
    </body>
  </html>
  ```

### create the view

  the action above requests to render a file at `myapp/views/root/index.html`. 
  create this file with the following contents.

  ```html
  {% extends '../layouts/layout.html' %}
  {% block content %}
  <h1>{{ msg }}</h1>
  {% endblock %}
  ``` 

### create the server (app.js)

  the whole application starts with a file at `myapp/app.js`. 
  below is an example that couldn't be much easier.

  ```js
  require('bowline').startServer(4000);
  ```

### start your application

  ```shell
  $ node app.js
  ```

### see your page!

  navigate to `http://localhost:4000/` and enjoy!

## features

  * easy dynamic routing (controller/action)
  * auto-detect controllers and actions
  * support for multiple view systems (packaged with [swig](http://paularmstrong.github.io/swig/))
  * TODO: great logging
  * TODO: sessions
  * TODO: support for middleware
  * TODO: support for multiple css preprocessors
  * TODO: custom 4xx & 5xx views

##  api

### startServer(port, [callback])

  starts a server on `port` and calls the `callback` function when it's ready and listening.
  this is when all the controllers and actions are discovered by looking for `.js` files in a folder named
  `controllers` in the current working directory.

### templateFunction(fn)

  specify a function that will be used to render templates. the signature `fn(path, locals, callback)` is used.
  this is friendly for engines used with [consolidate](https://github.com/visionmedia/consolidate.js/).

## testing

  none yet

## why another web framework?

  i really enjoy the old-school ruby-on-rails routing which only used controllers and actions (controller/action).
  this enables developers to easily add new functionality, and it also helps other developers with mapping urls back to actual code.

  i also feel like most web frameworks for node are overkill for the projects that i'm working on. but, i also want a framework
  that can scale to a bigger project if needed.

  this is my attempt to increase productivity for many of the projects that i create.

  i hope it can help you too!

## license

  [MIT](LICENSE)