const http = require("http");
const body = JSON.stringify({
  email: "ss5689@srmist.edu.in",
  name: "Sharbba Sengupta",
  mobileNo: "9830405509",
  githubUsername: "23f2002684",
  rollNo: "RA2311003050143",
  accessCode: "QkbpxH",
});

const options = {
  hostname: "20.207.122.201",
  port: 80,
  path: "/evaluation-service/register",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};
console.log("Registering with AffordMed evaluation server...");
const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
    try {
      const parsed = JSON.parse(data);
      if (parsed.clientID && parsed.clientSecret) {
        console.log("\nRegistration successful!");
        console.log("clientID:     " + parsed.clientID);
        console.log("clientSecret: " + parsed.clientSecret);
        console.log("\nCopy these into auth.js");
      } else {
        console.log("\nRegistration response did not contain credentials.");
        console.log("Full response:", JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      console.log("Could not parse response as JSON:", data);
    }
  });
});
req.on("error", (err) => {
  console.error("Request failed:", err.message);
});
req.write(body);
req.end();
