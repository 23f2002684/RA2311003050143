// logger.js
// This is the logging middleware that sends logs to the evaluation server.
// We use this instead of console.log as required by the evaluation rules.

const https = require("https");
const http = require("http");

// The base URL of the evaluation server
const LOG_ENDPOINT = "http://20.207.122.201/evaluation-service/logs";

// We store the token here after auth so we don't pass it every time
let authToken = "";

function setToken(token) {
  authToken = token;
}

// This function sends a log entry to the evaluation server
function sendLog(stack, level, packageName, message) {
  // If there's no token yet just skip silently - we don't want to crash early
  if (!authToken) {
    return;
  }

  const body = JSON.stringify({
    stack: stack,
    level: level,
    package: packageName,
    message: message,
  });

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + authToken,
      "Content-Length": Buffer.byteLength(body),
    },
  };

  // Parse the URL manually since we're using plain http
  const url = new URL(LOG_ENDPOINT);
  options.hostname = url.hostname;
  options.port = url.port || 80;
  options.path = url.pathname;

  const req = http.request(options, (res) => {
    // We don't really need to do anything with the response here
    res.resume();
  });

  req.on("error", (err) => {
    // Silently ignore logging errors - we don't want to break the main flow
  });

  req.write(body);
  req.end();
}

// Helper functions for each log level - makes it easier to use
function debug(packageName, message) {
  sendLog("backend", "debug", packageName, message);
}

function info(packageName, message) {
  sendLog("backend", "info", packageName, message);
}

function warn(packageName, message) {
  sendLog("backend", "warn", packageName, message);
}

function error(packageName, message) {
  sendLog("backend", "error", packageName, message);
}

function fatal(packageName, message) {
  sendLog("backend", "fatal", packageName, message);
}

module.exports = {
  setToken,
  debug,
  info,
  warn,
  error,
  fatal,
};
