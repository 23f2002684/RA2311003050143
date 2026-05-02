const http = require("http");
const BASE_URL = "http://20.207.122.201";
const CLIENT_ID = "1005dc0a-04f9-44cb-afb6-815efc8d330b";
const CLIENT_SECRET = "mgJWVeMYtGZmmnjX";
const AUTH_PAYLOAD = {
  email: "ss5689@srmist.edu.in",
  name: "Sharbba Sengupta",
  rollNo: "RA2311003050143",
  accessCode: "QkbpxH",
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
};

// Calls the auth endpoint and returns the Bearer token
function getToken() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(AUTH_PAYLOAD);

    const options = {
      hostname: "20.207.122.201",
      port: 80,
      path: "/evaluation-service/auth",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error("No access_token in response: " + data));
          }
        } catch (e) {
          reject(new Error("Failed to parse auth response: " + data));
        }
      });
    });
    req.on("error", (err) => {
      reject(err);
    });

    req.write(body);
    req.end();
  });
}
module.exports = { getToken, CLIENT_ID, CLIENT_SECRET };
