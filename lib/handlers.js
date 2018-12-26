/*
 * Request Handlers
 *
 */

// Dependencies
var _data = require("./data");
var helpers = require("./helpers");
var config = require("../config");

//Define Handlers

var handlers = {};

// Users
handlers.users = function(data, callback) {
  var acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods
handlers._users = {};

// Users - POST
// Required Data: firstName, lastName, phone, password, tosAgreement
handlers._users.post = function(data, callback) {
  // Check that all required fields are filled out
  var firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  var lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  var phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  var password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  var tosAgreement =
    typeof data.payload.tosAgreement == "boolean" &&
    data.payload.tosAgreement == true
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't exist
    _data.read("users", phone, function(err, data) {
      if (err) {
        // Hash the password
        var hashedPass = helpers.hash(password);

        //Create the user object
        if (hashedPass) {
          var userObject = {
            firstName,
            lastName,
            phone,
            hashedPass,
            tosAgreement: true
          };

          // Store the user
          _data.create("users", phone, userObject, err => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: "Couldnt create user" });
            }
          });
        } else {
          callback(500, { Error: "Couldnt hash password" });
        }
      } else {
        //User already exists
        callback(404, { Error: "User exists" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Users - GET
//Required data: phone

handlers._users.get = function(data, callback) {
  //Check that the phone no. provided is valid
  var phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    //Get the token from the headers

    var token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    //verify the given token is valid
    handlers._tokens.verifyToken(token, phone, isValid => {
      if (isValid) {
        //Lookup the user
        _data.read("users", phone, function(err, data) {
          if (!err && data) {
            //Remove the hashed password
            delete data.hashedPass;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, { Error: "Invalid Token" });
      }
    });
  } else {
    callback(400, { Error: "Missing phone no." });
  }
};

// Users - PUT
//  Required data : phone
handlers._users.put = function(data, callback) {
  var phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  //check optional names
  var firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  var lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  var password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  //Error if the phone is invalid
  if (phone) {
    //Get the token from the headers

    var token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    //verify the given token is valid
    handlers._tokens.verifyToken(token, phone, isValid => {
      if (isValid) {
        if (firstName || lastName || password) {
          _data.read("users", phone, (err, userData) => {
            if (!err && userData) {
              //Update the fields
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPass = helpers.hash(password);
              }

              //Store the new data
              _data.update("users", phone, userData, err => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: "Could not update user" });
                }
              });
            } else {
              callback(400, { Error: "The specified user not exists" });
            }
          });
        } else {
          callback(400, { Error: "Missing fields to update" });
        }
      } else {
        callback(403, { Error: "Invalid Token" });
      }
    });
  } else {
    callback(400, { Error: " Missing required field" });
  }
};

// Users - DELETE
handlers._users.delete = function(data, callback) {
  var phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    //Get the token from the headers

    var token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    //verify the given token is valid
    handlers._tokens.verifyToken(token, phone, isValid => {
      if (isValid) {
        //Lookup the user
        _data.read("users", phone, function(err, userData) {
          if (!err && userData) {
            _data.delete("users", phone, err => {
              if (!err) {
                // Delete each of the checks associated with the user
                var userChecks =
                  typeof userData.checks == "object" &&
                  userData.checks instanceof Array
                    ? userData.checks
                    : [];

                var checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  var checksDeleted = 0;
                  var deletionErrors = false;
                  //Loop through the checks
                  userChecks.forEach(checkId => {
                    _data.delete("checks", checkId, err => {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if (checksDeleted == checksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error:
                              "Errors encountered while delelting checks of the user"
                          });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: "Couldnt delete the user" });
              }
            });
          } else {
            callback(400, { Error: "Couldnt find the specified user" });
          }
        });
      } else {
        callback(403, { Error: "Invalid Token" });
      }
    });
  } else {
    callback(400, { Error: "Missing phone no." });
  }
};

// * Tokens

handlers.tokens = function(data, callback) {
  var acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - POST
handlers._tokens.post = function(data, callback) {
  var phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  var password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone && password) {
    // Lookup the user who matches the phone
    _data.read("users", phone, function(err, userData) {
      if (!err && userData) {
        // Hash the password and compare it to the user
        var hashedPass = helpers.hash(password);
        if (hashedPass == userData.hashedPass) {
          // If valid create a new token. Set expiration date to 1hr
          var tokenId = helpers.createRandomString(20);

          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            phone,
            tokenId,
            expires
          };

          //Store the token
          _data.create("tokens", tokenId, tokenObject, err => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Could not create new token" });
            }
          });
        } else {
          callback(400, { Error: "Password MISMATCH" });
        }
      } else {
        callback(400, { Error: "Couldnt find the specified user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required Fields" });
  }
};

// Tokens - GET
handlers._tokens.get = function(data, callback) {
  // Check that the id is valid
  var tokenId =
    typeof data.queryStringObject.tokenId == "string" &&
    data.queryStringObject.tokenId.trim().length == 20
      ? data.queryStringObject.tokenId.trim()
      : false;
  if (tokenId) {
    //Lookup the user
    _data.read("tokens", tokenId, function(err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing phone no." });
  }
};

// Tokens - PUT
handlers._tokens.put = function(data, callback) {
  var tokenId =
    typeof data.payload.tokenId == "string" &&
    data.payload.tokenId.trim().length == 20
      ? data.payload.tokenId.trim()
      : false;
  var extend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? true
      : false;

  if (tokenId && extend) {
    _data.read("tokens", tokenId, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to make if the token is expired
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 100 * 60 * 60;

          //Store the new token
          _data.update("tokens", tokenId, tokenData, err => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: "Failed to update token" });
            }
          });
        } else {
          callback(400, { Error: "Token already expiration" });
        }
      } else {
        callback(400, { Error: "Specified token doesnt exist" });
      }
    });
  } else {
    callback(400, { Error: "Invalid fields" });
  }
};

// Tokens - DELETE
handlers._tokens.delete = function(data, callback) {
  //Check the id is valid
  var tokenId =
    typeof data.queryStringObject.tokenId == "string" &&
    data.queryStringObject.tokenId.trim().length == 20
      ? data.queryStringObject.tokenId.trim()
      : false;
  if (phone) {
    //Lookup the user
    _data.read("tokens", tokenId, function(err, data) {
      if (!err && data) {
        _data.delete("tokens", tokenId, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Couldnt delete the Token" });
          }
        });
      } else {
        callback(400, { Error: "Couldnt find the specified token" });
      }
    });
  } else {
    callback(400, { Error: "Missing phone no." });
  }
};

// Verify if a given token id is currently valid
handlers._tokens.verifyToken = function(id, phone, cb) {
  //Lookup the token
  _data.read("tokens", id, (err, tokenData) => {
    if (!err && tokenData) {
      //Check that the token is for given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        cb(true);
      } else {
        cb(false);
      }
    } else {
      cb(false);
    }
  });
};

// * Checks

handlers.checks = function(data, callback) {
  var acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the checks methods
handlers._checks = {};

//Checks - POST

handlers._checks.post = function(err, cb) {
  //Validate inputs
  var protocol =
    typeof data.payload.protocol == "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;
  var url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;
  var method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  var successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;
  var timeOut =
    typeof data.payload.timeOut == "number" &&
    data.payload.timeOut % 1 === 0 &&
    data.payload.timeOut >= 1 &&
    data.payload.timeOut <= 5
      ? data.payload.timeOut
      : false;

  if (protocol && url && method && successCodes && timeOut) {
    // Get the token from the headers
    var token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    //Lookup the user by token
    _data.read("tokens", token, (err, tokenData) => {
      if (!err && tokenData) {
        var userPhone = tokenData.phone;

        //Lookup the user data
        _data.read("users", userPhone, (err, userData) => {
          if (!err && userData) {
            var userChecks =
              typeof userData.checks == "object" &&
              userData.checks instanceof Array
                ? userData.checks
                : [];

            //Verify that the user has less than 5
            if (userChecks.length < config.maxChecks) {
              //Create a random id for the check
              var checkId = helpers.createRandomString(20);

              //Create the check object and include the users phone
              var checkObject = {
                checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeOut
              };

              //Save the object

              _data.create("checks", checkId, checkObject, err => {
                if (!err) {
                  //Add the check id to the users object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  //Save the user data
                  _data.update("users", userPhone, userData, err => {
                    if (!err) {
                      cb(200, userData);
                    } else {
                      cb(500, {
                        Error: "Unable to update new user with new check "
                      });
                    }
                  });
                } else {
                  cb(500, { Error: "couldnt create the new check" });
                }
              });
            } else {
              cb(400, {
                Error:
                  "The user already has the maximum no. of checks (" +
                  config.maxChecks +
                  ")"
              });
            }
          } else {
            cb(403);
          }
        });
      } else {
        cb(403);
      }
    });
  } else {
    cb(400, { Error: "Inputs are invalid or not provided" });
  }
};

//Checks - GET

handlers._checks.get = function(err, cb) {
  //Check that the id no. provided is valid
  var id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 10
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    //Lookup the check
    _data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        //Get the token from the headers
        var token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        //verify the given token is valid
        handlers._tokens.verifyToken(token, phone, isValid => {
          if (isValid) {
            //Lookup the user
            _data.read("users", phone, function(err, data) {
              if (!err && data) {
                cb(200, data);
              } else {
                cb(404);
              }
            });
          } else {
            cb(403, { Error: "Invalid Token" });
          }
        });
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { Error: "Missing phone no." });
  }
};

//Checks - PUT

handlers._checks.put = function(err, cb) {
  var id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 2
      ? data.payload.id.trim()
      : false;

  //Validate inputs
  var protocol =
    typeof data.payload.protocol == "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;
  var url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;
  var method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  var successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;
  var timeOut =
    typeof data.payload.timeOut == "number" &&
    data.payload.timeOut % 1 === 0 &&
    data.payload.timeOut >= 1 &&
    data.payload.timeOut <= 5
      ? data.payload.timeOut
      : false;

  //check to make sure id is valid
  if (id) {
    if (protocol || url || method || successCodes || timeOut) {
      _data.read("checks", id, (err, checkData) => {
        if (!err && checkData) {
          //Get the token from the headers
          var token =
            typeof data.headers.token == "string" ? data.headers.token : false;
          //verify the given token is valid
          handlers._tokens.verifyToken(token, phone, isValid => {
            if (isValid) {
              //Update the check where necessary'
              if (protocol) {
                checkData.protocol = protocol;
              }
              if (url) {
                checkData.url = url;
              }
              if (method) {
                checkData.method = method;
              }
              if (successCodes) {
                checkData.successCodes = successCodes;
              }
              if (timeOut) {
                checkData.timeOut = timeOut;
              }

              //Store the new updates
              _data.uptate("check", id, checkData, (err, cb) => {
                if (!err) {
                  cb(200);
                } else {
                  cb(500, { Error: "Couldnt update the checks" });
                }
              });
            } else {
              cb(403, { Error: "Invalid Token" });
            }
          });
        } else {
          cb(400, { Error: "check id not exist" });
        }
      });
    } else {
      cb(400, { Error: "Missing fields to update" });
    }
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

//Checks - DELETE

handlers._checks.delete = function(err, cb) {
  var id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 0
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    // Lookup the check
    _data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        //Get the token from the headers

        var token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        //verify the given token is valid
        handlers._tokens.verifyToken(token, checkData.userPhone, isValid => {
          if (isValid) {
            //Delete the check data
            _data.delete("checks", id, err => {
              if (!err) {
                //Lookup the user
                _data.read("users", checkData.userPhone, function(
                  err,
                  userData
                ) {
                  if (!err && userData) {
                    var userChecks =
                      typeof userData.checks == "object" &&
                      userData.checks instanceof Array
                        ? userData.checks
                        : [];

                    //Remove the deleted checks from that list

                    var checkPosition = userChecks.indexof(id);
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);

                      //Resave the data
                      _data.update(
                        "users",
                        checkData.userPhone,
                        userData,
                        err => {
                          if (!err) {
                            cb(200);
                          } else {
                            cb(500, { Error: "Couldnt update the user" });
                          }
                        }
                      );
                    } else {
                      cb(500, {
                        Error: "Couldnt find the check on user object"
                      });
                    }
                  } else {
                    cb(500, {
                      Error: "Couldnt find the specified user with the check"
                    });
                  }
                });
              } else {
                cb(500, { Error: "Couldnt delete the check" });
              }
            });
          } else {
            cb(403, { Error: "Invalid Token" });
          }
        });
      } else {
        cb(400, { Error: "THe specified check doesnt exist" });
      }
    });
  } else {
    cb(400, { Error: "Missing phone no." });
  }
};

//Ping handler
handlers.ping = (data, callback) => {
  callback(200);
};

//Not Found Handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Exporting handlers
module.exports = handlers;
