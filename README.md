# AffordMed Evaluation Submission

## Project Structure

```
AffordMedical/
├── logger.js                    # Logging middleware (sends logs to evaluation server)
├── auth.js                      # Auth helper (gets Bearer token)
├── package.json
├── vehicle_scheduling/
│   └── scheduler.js             # Vehicle Maintenance Scheduler (0/1 Knapsack)
└── campus_notifications/
    ├── priority_inbox.js        # Stage 6 - Priority Inbox implementation
    └── notification_system_design.md  # Stages 1-6 written responses
```

## Setup

1. **Fill in your credentials in `auth.js`:**
   ```js
   const CLIENT_ID = "your-client-id";
   const CLIENT_SECRET = "your-client-secret";
   ```

2. **Run the Vehicle Scheduler:**
   ```
   node vehicle_scheduling/scheduler.js
   ```

3. **Run the Priority Inbox (Campus Notifications Stage 6):**
   ```
   node campus_notifications/priority_inbox.js
   ```

## Notes

- All logging is done through `logger.js` which sends logs to the AffordMed evaluation server
- No built-in `console.log` or language loggers are used for logging (evaluation requirement)
- The vehicle scheduler uses a standard 0/1 Knapsack DP algorithm
- The priority inbox ranks notifications by type weight (Placement > Result > Event) and recency
