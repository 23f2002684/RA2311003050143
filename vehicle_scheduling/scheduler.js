// vehicle_scheduling/scheduler.js
// Main script for the Vehicle Maintenance Scheduler task.
//
// What this does:
// 1. Gets the auth token
// 2. Fetches all depots (each depot has a mechanic-hour budget)
// 3. Fetches all vehicles/tasks (each has a duration and an impact score)
// 4. For each depot, figures out which tasks to schedule to maximize total impact
//    without going over the mechanic-hour budget (classic knapsack problem)
// 5. Prints out the selected task IDs for each depot

const http = require("http");
const logger = require("../logger");
const { getToken } = require("../auth");

const BASE_URL = "http://20.207.122.201";

// Simple helper to make GET requests to the evaluation server
function fetchFromServer(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "20.207.122.201",
      port: 80,
      path: path,
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
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Could not parse response from " + path));
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
}

// This is the knapsack solver.
// Given a list of tasks (each with duration and impact) and a max budget,
// it picks the best subset of tasks to maximize total impact.
//
// We use a simple DP table approach - straightforward and easy to understand.
// dp[i][w] = best impact we can get using first i tasks with w hours available
function solveKnapsack(tasks, maxHours) {
  const n = tasks.length;

  // Create a 2D table filled with zeros
  // rows = tasks, columns = hour budgets from 0 to maxHours
  let dp = [];
  for (let i = 0; i <= n; i++) {
    dp.push(new Array(maxHours + 1).fill(0));
  }

  // Fill the table row by row
  for (let i = 1; i <= n; i++) {
    const task = tasks[i - 1];
    const duration = task.Duration;
    const impact = task.Impact;

    for (let w = 0; w <= maxHours; w++) {
      // Option 1: don't include this task
      dp[i][w] = dp[i - 1][w];

      // Option 2: include this task (only if it fits)
      if (duration <= w) {
        const withThisTask = dp[i - 1][w - duration] + impact;
        if (withThisTask > dp[i][w]) {
          dp[i][w] = withThisTask;
        }
      }
    }
  }

  // Now trace back through the table to find which tasks were actually selected
  let selected = [];
  let remainingHours = maxHours;

  for (let i = n; i >= 1; i--) {
    // If including this task changed the value, it was selected
    if (dp[i][remainingHours] !== dp[i - 1][remainingHours]) {
      selected.push(tasks[i - 1].TaskID);
      remainingHours -= tasks[i - 1].Duration;
    }
  }

  return {
    selectedTasks: selected,
    totalImpact: dp[n][maxHours],
  };
}

async function main() {
  logger.info("vehicle_scheduling", "Starting vehicle maintenance scheduler");

  // Step 1: Get the auth token
  logger.info("vehicle_scheduling", "Fetching auth token");
  let token;
  try {
    token = await getToken();
    logger.setToken(token);
    logger.info("vehicle_scheduling", "Got auth token successfully");
  } catch (err) {
    logger.fatal("vehicle_scheduling", "Failed to get auth token: " + err.message);
    process.exit(1);
  }

  // Step 2: Get all depots
  logger.info("vehicle_scheduling", "Fetching depot list from server");
  let depots;
  try {
    const response = await fetchFromServer("/evaluation-service/depots", token);
    depots = response.depots;
    logger.info("vehicle_scheduling", "Got " + depots.length + " depots");
  } catch (err) {
    logger.fatal("vehicle_scheduling", "Failed to fetch depots: " + err.message);
    process.exit(1);
  }

  // Step 3: Get all vehicles/tasks
  logger.info("vehicle_scheduling", "Fetching vehicle task list from server");
  let vehicles;
  try {
    const response = await fetchFromServer("/evaluation-service/vehicles", token);
    vehicles = response.vehicles;
    logger.info("vehicle_scheduling", "Got " + vehicles.length + " vehicle tasks");
  } catch (err) {
    logger.fatal("vehicle_scheduling", "Failed to fetch vehicles: " + err.message);
    process.exit(1);
  }

  // Step 4: For each depot, run the knapsack and figure out optimal schedule
  logger.info("vehicle_scheduling", "Starting scheduling for each depot");

  const results = {};

  for (let i = 0; i < depots.length; i++) {
    const depot = depots[i];
    logger.info(
      "vehicle_scheduling",
      "Scheduling for depot " + depot.ID + " (budget: " + depot.MechanicHours + " hours)"
    );

    const result = solveKnapsack(vehicles, depot.MechanicHours);

    results[depot.ID] = {
      depotID: depot.ID,
      budget: depot.MechanicHours,
      totalImpact: result.totalImpact,
      selectedTasks: result.selectedTasks,
    };

    logger.info(
      "vehicle_scheduling",
      "Depot " + depot.ID + ": selected " + result.selectedTasks.length +
      " tasks with total impact " + result.totalImpact
    );
  }

  // Step 5: Print the results
  logger.info("vehicle_scheduling", "All depots scheduled. Printing results.");
  
  console.log("\n=== Vehicle Maintenance Schedule Results ===\n");

  for (const depotID in results) {
    const r = results[depotID];
    console.log("Depot " + r.depotID + " (Budget: " + r.budget + " mechanic-hours)");
    console.log("Total Impact Score: " + r.totalImpact);
    console.log("Scheduled Tasks:");
    r.selectedTasks.forEach((taskID) => {
      console.log("  - " + taskID);
    });
    console.log("");
  }

  logger.info("vehicle_scheduling", "Scheduler finished successfully");
}

main();
