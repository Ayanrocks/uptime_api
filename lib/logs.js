/*
 *  Logging file
 *
 */

// Dependencies
var fs = require("fs"),
  path = require("path"),
  zlib = require("zlib");

//Container for the module
var lib = {};

// Base DIR for the data folder
lib.baseDir = path.join(__dirname, "/../.logs/");

// Append a string to a fil, create the file if it doesnt exist.
lib.append = function(file, str, cb) {
  //Opening the file for appending
  fs.open(lib.baseDir + file + ".log", "a", (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, str + "\n", e => {
        if (e) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              cb(false);
            } else {
              cb("Error closing file that was being appended");
            }
          });
        } else {
          cb("Error appending to file");
        }
      });
    } else {
      cb("Could not open file for appending");
    }
  });
};

//List all the logs and optionally include the compressed logs
lib.list = function(includeCompressedLogs, cb) {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      var trimmedFileNames = [];
      data.forEach(fileName => {
        //Add the .log files
        if (fileName.indexOf(".log") > -1) {
          trimmedFileNames.push(fileName.replace(".log", ""));
        }

        //Add on the .gz files
        if (fileName.indexOf(".gz.b64") > -1 && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace(".gz.b64", ""));
        }
      });
      cb(false, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

//Compress the contents of the one .log file into a .gz.b64 file within the same dir
lib.compress = function(logId, newFileId, cb) {
  var sourceFile = logId + ".log";
  var destFile = newFileId + ".gz.b64";

  //Read the source file
  fs.readFile(lib.baseDir + sourceFile, "utf8", (err, inputString) => {
    if (!err && inputString) {
      //Compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // Send the new data to the destination file
          fs.open(lib.baseDir + destFile, "wx", (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              //Write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString("base64"), err => {
                if (!err) {
                  //Close the destination file
                  fs.close(fileDescriptor, err => {
                    if (!err) {
                      cb(false);
                    } else {
                      cb(err);
                    }
                  });
                } else {
                  cb(err);
                }
              });
            } else {
              cb(err);
            }
          });
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

//Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function(fileId, cb) {
  var fileName = fileId + ".gz.b64";
  fs.readFile(lib.baseDir + fileName, "utf8", (err, str) => {
    if (!err && str) {
      //Decompress the data
      var inputBuffer = Buffer.from(str, "base64");
      zlib.unzip(inputBuffer, (err, outBuffer) => {
        if (!err && outputBuffer) {
          //Callback
          var str = outBuffer.toString();
          cb(false, str);
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

// truncate a log file
lib.truncate = function(logId, cb) {
  fs.truncate(lib.baseDir + logId + ".log", 0, err => {
    if (!err) {
      cb(false);
    } else {
      cb(err);
    }
  });
};

//Export the module
module.exports = lib;
