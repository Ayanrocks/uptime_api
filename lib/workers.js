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
  url = require("url"),
  _logs = require("./logs"),
  util = require("util"),
  debug = util.debuglog("workers");

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
            debug("Error reading check file");
          }
        });
      });
    } else {
      debug("Error could not find any checks to process");
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
    debug("Error: One of the checks is not properly formatted. Skipping it.");
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
  var outcomeSent = false;

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
  var _moduleToUse = originalCheckData.protocol == "http" ? http : https;
  var req = _moduleToUse.request(requestDetails, res => {
    //Grab the status of the sent request
    var status = res.statusCode;

    //Update the checkOutcome and pass the data  along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  //Bind to the error event so it doesnt get thrown
  req.on("error", e => {
    //update the checkOutcome and pass the data
    checkOutcome.error = { error: true, value: e };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  //Bind to the timeout event so it doesnt get thrown
  req.on("timeout", e => {
    //update the checkOutcome and pass the data
    checkOutcome.error = { error: true, value: "timeout" };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  //End the request
  req.end();
};

//Process the check outcome and update the data as needed
//Special logic for accomodating  a check that has never been tested before
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
  //Decide if the check is considered up or down
  var state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? "up"
      : "down";
  // Decide if an alert is warranted
  var alertWaranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  //log the outcome
  var timeOfCheck = Date.now();
  workers.log(
    originalCheckData,
    checkOutcome,
    state,
    alertWaranted,
    timeOfCheck
  );

  // Update the check data
  var newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  //Save the updates to the disks
  _data.update("checks", newCheckData.id, newCheckData, e => {
    if (!e) {
      //Send the new checkData to the next phase
      if (alertWaranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        debug("Check outcome has not changes. No alert needed");
      }
    } else {
      debug("Erorr trying to save updated checks");
    }
  });
};

//Alert the user as to a change in their check status
workers.alertUserToStatusChange = function(newCheckData) {
  var msg = `Your check for ${newCheckData.method.toUpperCase()}${
    newCheckData.protocol
  }//${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, e => {
    if (!e) {
      debug("Success user alerted to a status change: " + msg);
    } else {
      debug("Unable to alert user");
    }
  });
};

workers.log = function(
  originalCheckData,
  checkOutcome,
  state,
  alertWaranted,
  timeOfCheck
) {
  // Form the log data
  var logData = {
    originalCheckData,
    checkOutcome,
    state,
    alertWaranted,
    timeOfCheck
  };

  //Convert data to a string
  var logString = JSON.stringify(logData);

  //Determine the name of the log file
  var logFileName = originalCheckData.id;

  //Append the log string to the file
  _logs.append(logFileName, logString, err => {
    if (!err) {
      debug("Logging to file succeeded");
    } else {
      debug("Logging to file failed");
    }
  });
};

//Timer to execute the worker-process once per minute
workers.loop = function() {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

//timer to execute log rotation process once per day
workers.logRotationLoop = function() {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

//Rotate (compress) the log files
workers.rotateLogs = function() {
  //List all the (non-compressed) log files
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach(logName => {
        // Compress the data to a different file
        var logId = logName.replace(".log", "");
        var newFileId = logId + "-" + Date.now();
        _logs.compress(logId, newFileId, err => {
          if (!err) {
            //Truncate the log
            _logs.truncate(logId, err => {
              if (!err) {
                debug("Success truncating logFile");
              } else {
                debug("Error truncating log");
              }
            });
          } else {
            debug("Error compressing one of the log file", err);
          }
        });
      });
    } else {
      debug("Error could not find any logs to rotate");
    }
  });
};

//Init script
workers.init = function() {
  //Send to console, in yellow
  console.log("\x1b[33m%s\x1b[0m", "Background workers are running");

  //Execute all the checks immediately
  workers.gatherAllChecks();
  //Call the loop so the checks will execute later on
  workers.loop();

  //Compress all the logs immediately
  workers.rotateLogs();

  //Call the compression loop to logs will be compressed later on
  workers.logRotationLoop();
};

//Export workers
module.exports = workers;
