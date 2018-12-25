/*
 *   Helpers for various task
 *
 */

//Dependencies
var crypto = require("crypto");
var config = require("../config");

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

// Export the module
module.exports = helpers;
