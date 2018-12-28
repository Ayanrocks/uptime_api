/*
 *   Helpers for various task
 *
 */

//Dependencies
var crypto = require("crypto");
var config = require("../config");
var https = require("https");
var queryString = require("querystring");
var path = require("path");
var fs = require("fs");

// Container for all helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = function(str) {
  if (typeof str == "string" && str.length > 0) {
    var hash = crypto
      .createHmac("sha256", config.hashingSecret)
      .update(str)
      .digest("hex");
    return hash;
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = str => {
  try {
    var obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

//Create random string of given length
helpers.createRandomString = strlength => {
  strlength = typeof strlength == "number" && strlength > 0 ? strlength : false;
  if (strlength) {
    //Define all the possible characters that could go into string
    var possibleCharacters = "abcdefghijklmnopqrst0123456789";
    //start the final string
    var str = "";
    for (let i = 1; i <= strlength; i++) {
      //Get a random character from the possibleCharacters
      var randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );
      //Append this character to the final string
      str += randomCharacter;
    }

    //Return the final string
    return str;
  } else {
    return false;
  }
};

// Send an SMS by twilio
helpers.sendTwilioSms = function(phone, msg, cb) {
  //Validate Parameters
  phone =
    typeof phone == "string" && phone.trim().length == 10
      ? phone.trim()
      : false;
  msg =
    typeof msg == "string" &&
    msg.trim().length > 0 &&
    msg.trim().length > 0 &&
    msg.trim().length <= 1600
      ? msg.trim()
      : false;

  if (phone && msg) {
    // Configure the request payload
    var payload = {
      From: config.twilio.fromPhone,
      To: phone,
      Body: msg
    };

    //Stringify the payload
    var stringPayload = queryString.stringify(payload);
    // configure the request details
    var requestDetails = {
      protocol: "https:",
      hostname: "api.twilio.com",
      method: "POST",
      path:
        "/2010-04-01/Accounts/" + config.twilio.accountSid + "/Messages.json",
      auth: config.twilio.accountSid + ":" + config.twilio.authToken,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "content-Length": Buffer.byteLength(stringPayload)
      }
    };

    //Instantiate the request object
    var req = https.request(requestDetails, res => {
      //Grab the status of the sent request
      var status = res.statusCode;
      //Callback successfully if the request went through
      if (status == 200 || status == 201) {
        cb(false);
      } else {
        cb("Status Code returned was " + status);
      }
    });

    //Bind to the error event so it doesnt get thrown
    req.on("error", e => {
      cb(e);
    });

    //Add the payload
    req.write(stringPayload);

    //End the request
    req.end();
  } else {
    cb("Given parameters missing");
  }
};

//Get the string content of a template
helpers.getTemplate = function(templateName, data, cb) {
  templateName =
    typeof templateName == "string" && templateName.length > 0
      ? templateName
      : false;
  data = typeof data == "object" && data !== null ? data : {};

  if (templateName) {
    var templatesDir = path.join(__dirname, "../templates/");
    fs.readFile(templatesDir + templateName + ".html", "utf8", (err, str) => {
      if (!err && str && str.length > 0) {
        // Do interpolation on the string
        var finalString = helpers.interpolate(str, data);
        cb(false, finalString);
      } else {
        cb("No template could be found");
      }
    });
  } else {
    cb("A valid template name was not specified");
  }
};

// Add the universal header and footer to the string and pass provided object to header and footer for interpolation
helpers.addUniversalTemplates = (str, data, cb) => {
  str = typeof str == "string" && str.length > 0 ? str : "";
  data = typeof data == "object" && data !== null ? data : {};

  //get the header
  helpers.getTemplate("_header", data, (err, headerString) => {
    if (!err && headerString) {
      //Get the footer
      helpers.getTemplate("_footer", data, (err, footerString) => {
        if (!err && footerString) {
          //Add them all together
          var fullString = headerString + str + footerString;
          cb(false, fullString);
        } else {
          cb("Couldnot get footer string");
        }
      });
    } else {
      cb("Couldnot get header template");
    }
  });
};

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = function(srt, data) {
  str = typeof str == "string" && str.length > 0 ? str : "";
  data = typeof data == "object" && data !== null ? data : {};

  //Add the templateGlobals do the data object, prepending their key name with "global"

  for (var keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data["global." + keyName] = config.templateGlobals[keyName];
    }
  }

  //For each key in the data object , insert its value into the string at the correct position
  for (var key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] == "string") {
      var replace = data[key];
      var find = "{" + key + "}";
      str = str.replace(find.replace);
    }
  }

  return str;
};

// Export the module
module.exports = helpers;
