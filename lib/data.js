/*
 * Library for storing and  editing data
 *
 */

//Dependencies
var fs = require("fs");
var path = require("path");
var helpers = require("./helpers");

// Container for the module(to be exported)
var lib = {};

// Base DIR for the data folder
lib.baseDir = path.join(__dirname, "/../.data/");

//write data to a file
lib.create = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(lib.baseDir + dir + "/" + file + ".json", "wx", function(
    err,
    fileDescriptor
  ) {
    if (!err && fileDescriptor) {
      // convert data to string
      var stringData = JSON.stringify(data);

      // Write data to file
      fs.writeFile(fileDescriptor, stringData, err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing the file");
            }
          });
        } else {
          callback("Error writing to new file");
        }
      });
    } else {
      callback("Could not create new file. It may already exist");
    }
  });
};

// Read data from a file
lib.read = (dir, file, callback) => {
  fs.readFile(lib.baseDir + dir + "/" + file + ".json", "utf8", (err, data) => {
    if (!err && data) {
      var parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(err, data);
    }
  });
};

// Update data from a file
lib.update = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(
    lib.baseDir + dir + "/" + file + ".json",
    "r+",
    (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        // convert data to string
        var stringData = JSON.stringify(data);

        //Truncate the file
        fs.truncate(fileDescriptor, err => {
          if (!err) {
            // Write to the file and close it
            fs.writeFile(fileDescriptor, stringData, err => {
              if (!err) {
                fs.close(fileDescriptor, err => {
                  if (!err) {
                    callback(false);
                  } else {
                    callback("Error closing the file");
                  }
                });
              } else {
                callback("Error writing to existing file");
              }
            });
          } else {
            callback("Error truncating!!!");
          }
        });
      } else {
        callback("cannot open file for updating.");
      }
    }
  );
};

// Delete Data from a file
lib.delete = (dir, file, callback) => {
  // Unlink the file
  fs.unlink(lib.baseDir + dir + "/" + file + ".json", err => {
    if (!err) {
      callback(false);
    } else {
      callback("Error deleting the file");
    }
  });
};

//List all the items in a directory
lib.list = function(dir, cb) {
  fs.readdir(lib.baseDir + dir + "/", (err, data) => {
    if (!err && data && data.length > 0) {
      var trimmedFileNames = [];
      data.forEach(fileName => {
        trimmedFileNames.push(fileName.replace(".json", ""));
      });
      cb(false, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

//Export the module
module.exports = lib;
