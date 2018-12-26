/*
 *   Worker related task
 *
 */

//Dependencies
var path = require("path"),
  fs = require("fs"),
  _data = require("./data"),
  https = require("https"),
  http = require("http"),
  helpers = require("./helpers"),
  url = require("url");

//Instantiate the worker object
var workers = {};

// Lookup all checks, get their data and send to the validator
workers.gatherAllChecks = function() {
  //get all the checks
  _data.list("checks", (e, checks) => {
    if (!e && checks && checks.length > 0) {
      checks.forEach(check => {
        // Read in the check data
        _data.read("checks", check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            //Pass it to the check validator, and let that function continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else {
            console.log("Error reading check file");
          }
        });
      });
    } else {
      console.log("Error could not find any checks to process");
    }
  });
};

//Sanity check the checck data
workers.validateCheckData = function(originalCheckData) {
  originalCheckData =
    typeof originalCheckData == " object" && originalCheckData !== null
      ? originalCheckData
      : {};
  originalCheckData.id =
    typeof originalCheckData.id == "string" &&
    originalCheckData.id.trim().length == 20
      ? originalCheckData.id.trim()
      : false;
  originalCheckData.userPhone =
    typeof originalCheckData.userPhone == "string" &&
    originalCheckData.userPhone.trim().length == 10
      ? originalCheckData.userPhone.trim()
      : false;
  originalCheckData.protocol =
    typeof originalCheckData.protocol == "string" &&
    ["https", "http"].indexOf(originalCheckData.protocol) > -1
      ? originalCheckData.protocol
      : false;
  originalCheckData.url =
    typeof originalCheckData.url == "string" &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false;
  originalCheckData.method =
    typeof originalCheckData.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(originalCheckData.method) > -1
      ? originalCheckData.method
      : false;
  originalCheckData.successCodes =
    typeof originalCheckData.successCodes == "string" &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;
  originalCheckData.timeOut =
    typeof originalCheckData.timeOut == "number" &&
    originalCheckData.timeOut % 1 === 0 &&
    originalCheckData.timeOut.length > 0 &&
    originalCheckData.timeOut.length <= 5
      ? originalCheckData.timeOut
      : false;

  //Set the keys that may not be set (if the workers have never seen this check before)
  originalCheckData.state =
    typeof originalCheckData.state == "string" &&
    ["up", "down"].indexOf(originalCheckData.state) > -1
      ? originalCheckData.state
      : "down";

  originalCheckData.lastChecked =
    typeof originalCheckData.timeOut == "number" &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;

  // If all  the checks pass, pass the data along to the next step in the process
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.method &&
    originalCheckData.url &&
    originalCheckData.successCodes &&
    originalCheckData.timeOut
  ) {
    workers.performCheck(originalCheckData);
  } else {
    console.log(
      "Error: One of the checks is not properly formatted. Skipping it."
    );
  }
};

// Perform the check, send the original check process and the outcome of the check process, to the next step
workers.performCheck = function(originalCheckData) {
  //Prepare the initial check outcome
  var checkOutcome = {
    error: false,
    responseCode: false
  };

  //Mark that the outome has not been sent yet
  var outcome = false;

  //Parse the hostname and the path out of the original check data
  var parsedUrl = url.parse(
    originalCheckData.protocol + "://" + originalCheckData.url,
    true
  );
  var hostName = parsedUrl.hostname;
  var path = parsedUrl.path; // Using path and not "pathname" because we want the query string

  //Construct the request
  var requestDetails = {
    protocol: originalCheckData.protocol + ":",
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeOut * 1000
  };

  // Instantiate the request object using either http or https module
};

//Timer to execute the worker-process once per minute
workers.loop = function() {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

//Init script
workers.init = function() {
  //Execute all the checks immediately
  workers.gatherAllChecks();
  //Call the loop so the checks will execute later on
  workers.loop();
};

//Export workers
module.exports = workers;
