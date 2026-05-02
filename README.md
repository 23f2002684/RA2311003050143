# AffordMed Evaluation Submission

## Project Structure

```
AffordMedical/
*logger.js                    # Logging middleware (sends logs to evaluation server)
*auth.js                      # Auth helper (gets Bearer token)
*package.json
*vehicle_scheduling/
    **scheduler.js             # Vehicle Maintenance Scheduler (0/1 Knapsack)
*campus_notifications/
    **priority_inbox.js        # Stage 6 - Priority Inbox implementation
    **notification_system_design.md  
```

## Setup

1. **Fill in credentials in `auth.js`:**
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
