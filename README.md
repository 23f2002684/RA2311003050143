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
4. Reference Images:
<img width="1561" height="1013" alt="Screenshot 2026-05-02 115932" src="https://github.com/user-attachments/assets/1be0c826-a9d9-4817-a9df-272cb9f9caed" />
<img width="1566" height="1016" alt="Screenshot 2026-05-02 115910" src="https://github.com/user-attachments/assets/1f5946f3-a58e-42c5-b5e8-7e18bac3af82" />
<img width="1593" height="1034" alt="Screenshot 2026-05-02 115719" src="https://github.com/user-attachments/assets/0f48216a-8951-4fbe-9c05-3182b57ddca7" />
<img width="1559" height="988" alt="Screenshot 2026-05-02 114649" src="https://github.com/user-attachments/assets/107c2e63-354e-4b17-98a5-618b96e33b46" />
<img width="1571" height="997" alt="Screenshot 2026-05-02 114352" src="https://github.com/user-attachments/assets/33e95c99-00c7-4009-a2bb-7593ee7b373d" />
