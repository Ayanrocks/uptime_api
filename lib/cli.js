/*
 *   CLI related task
 *
 */

// Dependencies
var readLine = require("readline"),
  util = require("util"),
  debug = util.debuglog("cli"),
  events = require("events"),
  os = require("os"),
  v8 = require("v8"),
  _data = require("./data"),
  _logs = require("./logs"),
  helpers = require("./helpers");

class _events extends events {}
var e = new _events();

// Instantiate the CLI module object
var cli = {};

// Input handlers
e.on("man", str => {
  cli.responders.help();
});

e.on("help", str => {
  cli.responders.help();
});

e.on("exit", str => {
  cli.responders.exit();
});

e.on("stats", str => {
  cli.responders.stats();
});

e.on("list users", str => {
  cli.responders.listUsers();
});

e.on("more user info", str => {
  cli.responders.moreUserInfo(str);
});

e.on("list checks", str => {
  cli.responders.listChecks(str);
});

e.on("more check info", str => {
  cli.responders.moreCheckInfo(str);
});

e.on("list logs", str => {
  cli.responders.listLogs();
});

e.on("more log info", str => {
  cli.responders.moreLogInfo(str);
});

// Responders object
cli.responders = {};

// Help / MAN Responder
cli.responders.help = function() {
  var commands = {
    man: "Show this help page",
    help: "Same as 'man' command ",
    exit: "Kill the cli and the app",
    stats:
      "Get statistics on the underlying operating system and resource utilization",
    "list users":
      "Shows a list of all the registered (undeleted) users in the system",
    "more user info --(userId)": "Show details of a specific user",
    "list checks --up --down":
      "Show a list of all active checks in the system, including their state. The --up and --down flags are both optional",
    "more checks info --(checkId)": "Show details of specified checks",
    "list logs": "Show a list of all the log files available to read",
    "more log info --(fileName)": "Show details of a specified log file"
  };

  //Show a header for the help page that is as wide as the screen
  cli.horizontalLine();
  cli.centered("CLI MANUAL");
  cli.horizontalLine();
  cli.verticalSpace(2);

  // SHow each command followed by its explanation in white and yellow respectively
  for (var key in commands) {
    if (commands.hasOwnProperty(key)) {
      var value = commands[key];
      var line = "\x1b[33m" + key + "\x1b[0m";
      var padding = 60 - line.length;
      for (let i = 0; i < padding; i++) {
        line += " ";
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace(1);

  //End with another horizontal line
  cli.horizontalLine();
};

cli.verticalSpace = lines => {
  lines = typeof lines == "number" && lines > 0 ? lines : 1;
  for (let i = 0; i < lines; i++) {
    console.log("");
  }
};

// Create a horizontal line across the screen
cli.horizontalLine = () => {
  // Get the available screen size
  var width = process.stdout.columns;

  var line = "";
  for (let i = 0; i < width; i++) {
    line += "-";
  }
  console.log(line);
};

// Create centered text on the screen
cli.centered = str => {
  str = typeof str == "string" && str.trim().length > 0 ? str.trim() : "";

  // Get the available screen size
  var width = process.stdout.columns;

  // Calculate the left padding there should be
  var leftPadding = Math.floor((width - str.length) / 2);

  //Put the left padded spaces before the string itself
  var line = "";
  for (let i = 0; i < leftPadding; i++) {
    line += " ";
  }
  line += str;
  console.log(line);
};

// Exit

cli.responders.exit = function() {
  process.exit(0);
};

// Stats
cli.responders.stats = function() {
  //compile an object of stats
  var stats = {
    "LOAD AVERAGE": os.loadavg().join(" "),
    "CPU COUNT": os.cpus().length,
    "FREE MEMORY": os.freemem(),
    "CURRENT MALLOCED MEMORY": v8.getHeapStatistics().malloced_memory,
    "PEAK MALLOCED MEMORY": v8.getHeapStatistics().peak_malloced_memory,
    "ALLOCATED HEAP USED (%)": Math.round(
      (v8.getHeapStatistics().used_heap_size /
        v8.getHeapStatistics().total_heap_size) *
        100
    ),
    "AVAILABLE HEAP ALLOCATED (%)": Math.round(
      (v8.getHeapStatistics().total_heap_size /
        v8.getHeapStatistics().heap_size_limit) *
        100
    ),
    UPTIME: os.uptime() + " Seconds"
  };

  //Create a header for stats

  cli.horizontalLine();
  cli.centered("SYSTEM STATISTICS");
  cli.horizontalLine();
  cli.verticalSpace(2);

  // SHow each command followed by its explanation in white and yellow respectively
  for (var key in stats) {
    if (stats.hasOwnProperty(key)) {
      var value = stats[key];
      var line = "\x1b[33m" + key + "\x1b[0m";
      var padding = 60 - line.length;
      for (let i = 0; i < padding; i++) {
        line += " ";
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace(1);

  //End with another horizontal line
  cli.horizontalLine();
};

// List Users
cli.responders.listUsers = function() {
  _data.list("users", (err, userIds) => {
    if (!err && userIds && userIds.length > 0) {
      cli.verticalSpace(2);
      userIds.forEach(userId => {
        _data.read("users", userId, (err, userData) => {
          if (!err && userData) {
            var line =
              "Name: " +
              userData.firstName +
              " " +
              userData.lastNAme +
              " Phone:" +
              userData.phone +
              " Checks: ";
            var numberOfChecks =
              typeof userData.checks == "object" &&
              userData.checks instanceof Array &&
              userData.checks.length
                ? userData.checks.length
                : 0;
            line += numberOfChecks;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// More user info
cli.responders.moreUserInfo = function(str) {
  // Get the ID from the string
  var arr = str.split("--");
  var userId =
    typeof arr[1] == "string" && arr[1].trim().length > 0
      ? arr[1].trim()
      : false;
  if (userId) {
    //Lookup the user
    _data.read("users", userId, (err, userData) => {
      if (!err && userData) {
        // Remove the hashed password
        delete userData.hashedPass;

        //Print the JSON with text highlighting
        cli.verticalSpace(2);
        console.dir(userData, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

// list Checks
cli.responders.listChecks = function(str) {
  _data.list("checks", (err, checkIds) => {
    if (!err && checkIds && checkIds.length > 0) {
      cli.verticalSpace();
      checkIds.forEach(checkId => {
        _data.read("checks", checkId, (err, checkData) => {
          var includeCheck = false;
          var lowerString = str.toLowerCase();

          // Get the state, default to down
          var state =
            typeof checkData.state == "string" ? checkData.state : "down";

          //Get the state, default unknown
          var stateOrUnknown =
            typeof checkData.state == "string" ? checkData.state : "unknown";

          // If the user has specified the state or hasnt specified any state, include the current check accordingly
          if (
            lowerString.indexOf("--" + state) > -1 ||
            (lowerString.indexOf("--down") == -1 &&
              lowerString.indexOf("--up") == -1)
          ) {
            var line =
              "ID: " +
              checkData.id +
              " " +
              checkData.method.toUpperCase() +
              " " +
              checkData.protocol +
              "://" +
              checkData.url +
              " State: " +
              stateOrUnknown;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// More check info
cli.responders.moreCheckInfo = function(str) {
  // Get the ID from the string
  var arr = str.split("--");
  var checkId =
    typeof arr[1] == "string" && arr[1].trim().length > 0
      ? arr[1].trim()
      : false;
  if (checkId) {
    //Lookup the user
    _data.read("checks", checkId, (err, checkData) => {
      if (!err && checkData) {
        //Print the JSON with text highlighting
        cli.verticalSpace(2);
        console.dir(checkData, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

// List logs
cli.responders.listLogs = function() {
  _logs.list(true, (err, logFileNames) => {
    if (!err && logFileNames.length > 0) {
      cli.verticalSpace();
      logFileNames.forEach(logFileName => {
        if (logFileName.indexOf("-") > -1) {
          console.log(logFileName);
          cli.verticalSpace();
        }
      });
    }
  });
};

// more logs info
cli.responders.moreLogInfo = function(str) {
  // Get the LogFileName from the string
  var arr = str.split("--");
  var logFileName =
    typeof arr[1] == "string" && arr[1].trim().length > 0
      ? arr[1].trim()
      : false;
  if (logFileName) {
    cli.verticalSpace();
    //Decompress the log
    _logs.decompress(logFileName, (err, strData) => {
      if (!err && strData) {
        // SPlit into lines
        var arr = strData.split("\n");
        arr.forEach(jsonString => {
          var logObject = helpers.parseJsonToObject(jsonString);
          if (logObject && JSON.stringify(logObject) !== {}) {
            console.dir(logObject, { colors: true });
            cli.verticalSpace();
          }
        });
      }
    });
  }
};

//* Input processor
cli.processInput = str => {
  str = typeof str == "string" && str.trim().length > 0 ? str.trim() : false;
  if (str) {
    // Codify the unique string that identify the unique questions allowed to be asked
    var uniqeInputs = [
      "man",
      "help",
      "exit",
      "stats",
      "list users",
      "more user info",
      "list checks",
      "more checks info",
      "list logs",
      "more log info"
    ];

    // Go through the possible inputs and emit an event when a match is found
    var matchFound = false;
    var counter = 0;
    uniqeInputs.some(input => {
      if (str.toLowerCase().indexOf(input) > -1) {
        matchFound = true;
        // Emit an event matching the unique input, and include the full string given
        e.emit(input, str);
      }
    });

    // If no match is found tell the user to try again
    if (!matchFound) {
      console.log("Sorry comand doesn't exist");
    }
  }
};

// Init script
cli.init = function() {
  // Send the start message in dark blue to the console
  console.log("\x1b[34m%s\x1b[0m", "The CLI is running");

  // Start the interface
  var _interface = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> "
  });

  // Create an initial prompt
  _interface.prompt();

  // Handle each line of input separately
  _interface.on("line", function(str) {
    // Send to the input processor
    cli.processInput(str);

    // Reinitialize the prompt afterwards
    _interface.prompt();
  });

  // If the user stops the cli, kill the associated process
  _interface.on("close", function() {
    process.exit(0);
  });
};

// Export the module
module.exports = cli;
