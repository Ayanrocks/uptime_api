/*
 * Primary File for the API
 *
 */

//Dependencies
var server = require("./lib/server");
var workers = require("./lib/workers");
var cli = require("./lib/cli");
var exampleProblem = require("./lib/exampleDebuggingProblem");

// Declare the app
var app = {};

// Init Function

app.init = function() {
  //Start the server
  debugger;
  server.init();
  debugger;

  //Start the workers
  debugger;
  workers.init();

  debugger;
  // Start the CLI
  setTimeout(function() {
    cli.init();
  }, 50);

  //!debugging

  var foo = 1;
  console.log("defined with 1");

  foo++;
  console.log("added with 1");

  foo = foo ** 2;
  console.log("squared");

  foo = foo.toString();
  console.log("stringed");

  exampleProblem.init();
};

//Execute
app.init();

//Export the app
module.exports = app;
