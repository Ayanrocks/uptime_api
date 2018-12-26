/*
 * Create and export configuration variables
 *
 */

//Container for all the environments
var environments = {};

//Staging (default) environment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: "staging",
  hashingSecret: "ehrv4viuguh3o2ihcoi32h4o2y4",
  maxChecks: 5,
  twilio: {
    accountSid: "AC1918fd53b8a7d18d8faf58b9c33aa283",
    authToken: "720ca20c5a32dc95898ada3e7f87425f",
    fromPhone: "+15005550006"
  }
};

//Production Environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: "production",
  hashingSecret: "8y48ybc384y23ehru3yriqwjqiy384",
  maxChecks: 5,
  twilio: {
    accountSid: "AC1918fd53b8a7d18d8faf58b9c33aa283",
    authToken: "720ca20c5a32dc95898ada3e7f87425f",
    fromPhone: "+15005550006"
  }
};

//Determines which environment was passed as a command-line argument

var currentEnvironment =
  typeof process.env.NODE_ENV === "string"
    ? process.env.NODE_ENV.toLowerCase()
    : "";

// Check that the current environment above, if not, default is staging

var environmentToExport =
  typeof environments[currentEnvironment] === "object"
    ? environments[currentEnvironment]
    : environments.staging;

// Export the module

module.exports = environmentToExport;
