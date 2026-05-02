const http = require("http");
const logger = require("../logger");
const { getToken } = require("../auth");
const TOP_N = 10;
const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};
function fetchNotifications(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "20.207.122.201",
      port: 80,
      path: "/evaluation-service/notifications",
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
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
          resolve(parsed.notifications);
        } catch (e) {
          reject(new Error("Failed to parse notifications response"));
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
}
// We use a combination of the type weight and how recent it is.
// For recency, we convert the timestamp to a Unix timestamp (milliseconds)
// and then normalize it. More recent = higher number = higher score.
function calculateScore(notification, oldestTime, newestTime) {
  const typeWeight = TYPE_WEIGHTS[notification.Type] || 1;
  const notifTime = new Date(notification.Timestamp).getTime();
  // Normalize recency between 0 and 1  
  let recencyScore = 1;
  if (newestTime !== oldestTime) {
    recencyScore = (notifTime - oldestTime) / (newestTime - oldestTime);
  }
'''We weight the type more heavily (multiplied by 10) so type is the dominant factorbut recency acts as a tiebreaker within the same type'''
  const score = typeWeight * 10 + recencyScore;

  return score;
}

async function main() {
  logger.info("campus_notifications", "Starting priority inbox for campus notifications");

  // Get the auth token first
  logger.info("campus_notifications", "Getting auth token");
  let token;
  try {
    token = await getToken();
    logger.setToken(token);
    logger.info("campus_notifications", "Auth token received");
  } catch (err) {
    logger.fatal("campus_notifications", "Auth failed: " + err.message);
    process.exit(1);
  }

  // Fetch all notifications
  logger.info("campus_notifications", "Fetching notifications from server");
  let notifications;
  try {
    notifications = await fetchNotifications(token);
    logger.info("campus_notifications", "Fetched " + notifications.length + " notifications total");
  } catch (err) {
    logger.fatal("campus_notifications", "Failed to fetch notifications: " + err.message);
    process.exit(1);
  }

  if (!notifications || notifications.length === 0) {
    logger.warn("campus_notifications", "No notifications found");
    console.log("No notifications found.");
    return;
  }
  let oldestTime = Infinity;
  let newestTime = -Infinity;

  for (let i = 0; i < notifications.length; i++) {
    const t = new Date(notifications[i].Timestamp).getTime();
    if (t < oldestTime) oldestTime = t;
    if (t > newestTime) newestTime = t;
  }

  logger.debug("campus_notifications", "Calculating priority scores for each notification");

  // Score every notification
  for (let i = 0; i < notifications.length; i++) {
    notifications[i].score = calculateScore(notifications[i], oldestTime, newestTime);
  }
  notifications.sort((a, b) => b.score - a.score);
  const topNotifications = notifications.slice(0, TOP_N);

  logger.info(
    "campus_notifications",
    "Showing top " + TOP_N + " priority notifications out of " + notifications.length
  );

  // Print the priority inbox
  console.log("\n=== Priority Inbox (Top " + TOP_N + " Notifications) ===\n");
  for (let i = 0; i < topNotifications.length; i++) {
    const n = topNotifications[i];
    console.log("#" + (i + 1) + " [" + n.Type + "] " + n.Message);
    console.log("    ID: " + n.ID);
    console.log("    Time: " + n.Timestamp);
    console.log("    Priority Score: " + n.score.toFixed(4));
    console.log("");
  }
  logger.info("campus_notifications", "Priority inbox displayed successfully");
}
main();
