/*
 * Primary File for the API
 *
 */

//Dependencies
var http = require("http");
var https = require("https");
var url = require("url");
var stringDecoder = require("string_decoder").StringDecoder;
var config = require("./config");
var fs = require("fs");
var handlers = require("./lib/handlers");
var helpers = require("./lib/helpers");

// The server should respond to all requet with a string
//Instantiate the http server
var httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

//Instantiate the https server
var httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem")
};
var httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

//Define a router
var router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};

// All the server logic for both  http and https server
var unifiedServer = function(req, res) {
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
  var decoder = new stringDecoder("UTF-8");
  var buffer = "";
  req.on("data", data => {
    buffer += decoder.write(data);
  });
  req.on("end", () => {
    buffer += decoder.end();

    //Choose the handler this request should go to. If one not found use the notFound Handler
    var choosenHandler =
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
        : handlers.notFound;

    //Construct the data object to send to the handler

    var data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer)
    };

    //Route the request to the handler specified in the router

    choosenHandler(data, (statusCode, payload) => {
      //Use the status code called back by the handler
      statusCode = typeof statusCode === "number" ? statusCode : 200;
      //Use the payload called back by the handler, or default to empty object
      payload = typeof payload === "object" ? payload : {};

      //Convert the payload to a string
      var payloadString = JSON.stringify(payload);

      //Return the response
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);

      //log the request path
      console.log("Returning res " + statusCode, payloadString);
    });
  });
};

//start the http server
httpServer.listen(config.httpPort, () => {
  console.log("The http server is listening");
});

//start the https server
httpsServer.listen(config.httpsPort, () => {
  console.log("The https server is listening");
});
