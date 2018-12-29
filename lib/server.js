/*
 *   Server related tasks
 *
 */

//Dependencies
var http = require("http");
var https = require("https");
var url = require("url");
var stringDecoder = require("string_decoder").StringDecoder;
var config = require("../config");
var fs = require("fs");
var handlers = require("./handlers");
var helpers = require("./helpers");
var path = require("path");
var util = require("util");
var debug = util.debuglog("workers");

// Instantiate the server module
var server = {};

// The server should respond to all requet with a string
//Instantiate the http server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

//Instantiate the https server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem"))
};
server.httpsServer = https.createServer(
  server.httpsServerOptions,
  (req, res) => {
    server.unifiedServer(req, res);
  }
);

// Process the response from the handler
server.processHandlerResponse = function(
  res,
  method,
  trimmedPath,
  statusCode,
  payload,
  contentType
) {
  //Determine the type of  response  (fallback to JSON)
  contentType = typeof contentType == "string" ? contentType : "json";

  //Use the status code called back by the handler
  statusCode = typeof statusCode === "number" ? statusCode : 200;

  //Convert the payload to a string

  //Return the response parts that are content-specific

  var payloadString = "";
  if (contentType == "json") {
    res.setHeader("Content-Type", "application/json");
    payload = typeof payload === "object" ? payload : {};
    var payloadString = JSON.stringify(payload);
  }
  if (contentType == "html") {
    res.setHeader("Content-Type", "text/html");
    payloadString = typeof payload === "string" ? payload : "";
  }

  if (contentType == "favicon") {
    res.setHeader("Content-Type", "image/x-icon");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }
  if (contentType == "css") {
    res.setHeader("Content-Type", "text/css");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }
  if (contentType == "png") {
    res.setHeader("Content-Type", "image/png");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }
  if (contentType == "jpg") {
    res.setHeader("Content-Type", "image/jpeg");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }
  if (contentType == "plain") {
    res.setHeader("Content-Type", "text/plain");
    payloadString = typeof payload !== "undefined" ? payload : "";
  }

  //Return the response-parts that are common to all content-types
  res.writeHead(statusCode);
  res.end(payloadString);

  //log the request path
  //If the response is 200 print green else print import { connect } from 'react-redux'
  if (statusCode == 200) {
    debug(
      "\x1b[32m%s\x1b[0m",
      method.toUpperCase() + " /" + trimmedPath + " " + statusCode
    );
  } else {
    debug(
      "\x1b[31m%s\x1b[0m",
      method.toUpperCase() + " /" + trimmedPath + " " + statusCode
    );
  }
};

//Define a router
server.router = {
  "": handlers.index,
  "account/create": handlers.accountCreate,
  "account/edit": handlers.accountEdit,
  "account/deleted": handlers.accountDeleted,
  "session/create": handlers.sessionCreate,
  "session/deleted": handlers.sessionDeleted,
  "checks/all": handlers.checksList,
  "checks/create": handlers.checksCreate,
  "checks/edit": handlers.checksEdit,
  ping: handlers.ping,
  "api/users": handlers.users,
  "api/tokens": handlers.tokens,
  "api/checks": handlers.checks,
  "favicon.ico": handlers.favicon,
  public: handlers.public,
  "examples/error": handlers.exampleError
};

// All the server logic for both  http and https server
server.unifiedServer = function(req, res) {
  //Get the url and parse it
  var parsedUrl = url.parse(req.url, true);

  //Get the path from the url
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, "");

  //Get the query string
  var queryStringObject = parsedUrl.query;

  //Get the http method
  var method = req.method.toLowerCase();

  //Get the headers as an object
  var headers = req.headers;

  //get the payload, if any
  var decoder = new stringDecoder("utf-8");
  var buffer = "";
  req.on("data", data => {
    buffer += decoder.write(data);
  });
  req.on("end", () => {
    buffer += decoder.end();

    //Choose the handler this request should go to. If one not found use the notFound Handler
    var choosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

    // If the request is within the public directory, use the public handler instead
    choosenHandler =
      trimmedPath.indexOf("public/") > -1 ? handlers.public : choosenHandler;

    //Construct the data object to send to the handler

    var data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer)
    };

    //Route the request to the handler specified in the router
    try {
      choosenHandler(data, (statusCode, payload, contentType) => {
        server.processHandlerResponse(
          res,
          method,
          trimmedPath,
          statusCode,
          payload,
          contentType
        );
      });
    } catch (e) {
      debug(e);
      server.processHandlerResponse(
        res,
        method,
        trimmedPath,
        500,
        { Error: "An unknown error has occured" },
        "json"
      );
    }
  });
};

//Init script
server.init = () => {
  //start the http server
  server.httpServer.listen(config.httpPort, () => {
    //Send to console, in yellow
    console.log("\x1b[36m%s\x1b[0m", "The http server is listening");
  });

  //start the https server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log("\x1b[35m%s\x1b[0m", "The https server is listening");
  });
};

//Export
module.exports = server;
