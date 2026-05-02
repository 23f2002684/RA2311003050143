# Notification System Design

## Stage 1

### REST API Design for Campus Notification Platform

The notification platform needs to support three types of notifications: Placements, Events, and Results. Below are the core REST API endpoints I'd design for this system.

---

#### Base URL
```
https://api.campus-notifications.com/v1
```

#### Authentication
All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

#### 1. Get All Notifications for a Student

```
GET /notifications
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |

**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "type": "Result",
      "message": "mid-sem results are out",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 20
}
```

---

#### 2. Mark a Notification as Read

```
PATCH /notifications/:id/read
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
  "isRead": true
}
```

**Response (404 Not Found):**
```json
{
  "error": "Notification not found"
}
```

---

#### 3. Mark All Notifications as Read

```
PATCH /notifications/read-all
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "All notifications marked as read",
  "updatedCount": 45
}
```

---

#### 4. Send a Notification to All Students (Admin Only)

```
POST /notifications/broadcast
```

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "Placement",
  "message": "TCS is hiring - apply by Friday",
  "targetStudentIds": ["all"]
}
```
> Note: `targetStudentIds` can be `["all"]` to notify everyone, or a list of specific student IDs.

**Response (202 Accepted):**
```json
{
  "jobId": "job-abc123",
  "message": "Notification broadcast job started",
  "estimatedRecipients": 50000
}
```
> We return 202 (Accepted) instead of 200 because the actual delivery happens asynchronously.

---

#### 5. Get Notification Count (Unread Badge)

```
GET /notifications/unread-count
```

**Response (200 OK):**
```json
{
  "unreadCount": 7
}
```

---

#### Real-Time Notifications

For real-time delivery, I'd use **WebSockets** (or Server-Sent Events as a simpler fallback).

**WebSocket Connection:**
```
wss://api.campus-notifications.com/v1/ws
```

**Connection handshake:**
The client connects and sends their auth token:
```json
{ "type": "auth", "token": "Bearer <token>" }
```

**Server pushes new notifications:**
```json
{
  "type": "new_notification",
  "data": {
    "id": "abc-123",
    "type": "Placement",
    "message": "Google hiring drive tomorrow",
    "createdAt": "2026-04-22T18:00:00Z"
  }
}
```

The client can keep the socket open and the server pushes events in real time whenever a new notification is created for that student.

---

## Stage 2

### Database Design

**Recommended DB: PostgreSQL (relational)**

I'll go with a relational database like PostgreSQL because:
- Student and notification data is structured and well-defined
- We need joins (e.g., fetch all unread notifications for a student)
- We need aggregations (e.g., count unread, find by type)
- SQL makes queries predictable and easy to reason about
- ACID guarantees are important when marking messages as read

---

#### Schema

```sql
-- Students table
CREATE TABLE students (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Notifications master table (the actual notification content)
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(20) NOT NULL CHECK (type IN ('Placement', 'Result', 'Event')),
    message     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Junction table - tracks which student got which notification and if they read it
CREATE TABLE student_notifications (
    id              SERIAL PRIMARY KEY,
    student_id      INT REFERENCES students(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMP,
    delivered_at    TIMESTAMP DEFAULT NOW()
);
```

---

#### Problems as Data Volume Grows

1. **The `student_notifications` table grows fast.** With 50,000 students and thousands of notifications per month, this table will have tens of millions of rows quickly. Queries slow down.

2. **Full table scans become expensive.** Without indexes, `WHERE student_id = X AND is_read = false` has to scan every row.

3. **Broadcast notifications are costly to write.** Sending one notification to 50,000 students means 50,000 inserts into `student_notifications`.

---

#### Sample SQL Queries

**Fetch all unread notifications for a student:**
```sql
SELECT n.id, n.type, n.message, n.created_at
FROM notifications n
JOIN student_notifications sn ON sn.notification_id = n.id
WHERE sn.student_id = 1042
  AND sn.is_read = false
ORDER BY n.created_at DESC
LIMIT 20;
```

**Mark a notification as read:**
```sql
UPDATE student_notifications
SET is_read = true, read_at = NOW()
WHERE student_id = 1042
  AND notification_id = 'd146095a-0d86-4a34-9e69-3900a14576bc';
```

---

## Stage 3

### Query Optimization

**The original slow query:**
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

**Is the query accurate?**

Mostly yes, but there are a few issues:
- `SELECT *` is wasteful — it fetches columns we might not need (like internal metadata)
- There's no `LIMIT`, so it returns every unread notification, which could be thousands of rows
- At 5,000,000 rows, without indexes, the DB has to do a full sequential scan every time

**Why is it slow?**

Without indexes, the database reads every single row in the `notifications` table to find the ones where `studentID = 1042 AND isRead = false`. This is a full table scan, O(n) in time complexity. At 5 million rows, that's very slow.

**What I would change:**

```sql
-- Add indexes for the most common filter columns
CREATE INDEX idx_notifications_student_read 
ON notifications(studentID, isRead);

CREATE INDEX idx_notifications_created_at 
ON notifications(createdAt DESC);

-- Better query
SELECT id, type, message, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC
LIMIT 20;
```

With a composite index on `(studentID, isRead)`, the DB can jump directly to rows for student 1042 that are unread. The `ORDER BY createdAt DESC` also benefits from an index on `createdAt`.

**Computation cost without index:** O(n) — full scan of all 5M rows  
**Computation cost with index:** O(log n + k) — index lookup + fetching k results

---

**Should we add indexes on every column?**

No, that's a bad idea. Here's why:
- Every index takes up disk space (could be gigabytes for a big table)
- Every `INSERT`, `UPDATE`, and `DELETE` has to update all those indexes — writes become significantly slower
- For a notifications table that gets massive writes (broadcasting to 50K students), this would kill write performance
- Only index columns that are actually used in WHERE clauses and JOINs

---

**Query to find all students who got a placement notification in the last 7 days:**

```sql
SELECT DISTINCT sn.student_id
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE n.type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

### Performance — Tackling the DB Overload

The problem is the DB is being hit on every page load for every student. Here are the solutions I'd consider:

---

**1. Pagination (simplest fix)**

Instead of loading all notifications, load 20 at a time. The query already gets lighter because of `LIMIT`, and the UI loads faster.

Tradeoff: Users might miss older notifications if they don't scroll/paginate.

---

**2. Caching with Redis**

Cache each student's notification feed in Redis with a short TTL (e.g., 60 seconds). When the student loads the page, we check Redis first. If the cache is warm, we skip the DB call entirely.

```
GET notifications:student:1042 → Redis hit → return cached list
                              → Redis miss → query DB → store in Redis → return
```

Tradeoff: Notifications might be stale for up to 60 seconds. Acceptable for most cases, but when someone sends an urgent notification it won't appear immediately.

---

**3. Unread Count Caching**

Instead of querying the full notification list just to show the badge count, cache the unread count separately. Update the count in Redis whenever a new notification arrives or is read.

This avoids heavy DB queries just for showing `(7)` in the navbar.

---

**4. Read-through / Write-through Caching**

When a notification is marked as read, update both DB and cache together. This keeps the cache consistent without waiting for TTL to expire.

---

**5. Database Read Replicas**

Route all read queries (fetching notifications) to a read replica. Writes (marking as read, broadcasting) go to the primary. This splits the load and lets the primary focus on writes.

Tradeoff: Small replication lag means reads might be slightly stale (~milliseconds usually).

The best real-world approach is usually a combination: **pagination + Redis caching + read replica**.

---

## Stage 5

### Reliability — Fixing notify_all

**Original pseudocode:**
```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

**Shortcomings:**

1. **Sequential processing** — 50,000 students processed one by one is extremely slow
2. **No error handling** — if `send_email` fails for student 200, the loop crashes and students 201–50,000 never get notified
3. **No retry logic** — a transient network error kills the whole broadcast
4. **Tight coupling** — email failure blocks DB save and in-app push
5. **No visibility** — if something fails, you don't know who got it and who didn't

---

**What happens when send_email fails for 200 students midway?**

With the original code, the whole function would crash (or skip those students silently). Students who came after student 200 in the loop never get notified at all. This is unacceptable.

---

**Should saving to DB and sending email happen together?**

Not in a strict transaction. Email delivery and DB writes are fundamentally different operations — you can't rollback an email. The right pattern is:

1. **Save to DB first** (reliable, transactional)
2. **Then trigger email** (best-effort, with retry)

If the email fails, the notification is still in the DB and the student can see it in the app. You can retry the email separately.

---

**Revised approach (pseudocode):**

```
function notify_all(student_ids: array, message: string):
    # Step 1: Write all notifications to DB in a batch
    # This is atomic and fast
    batch_insert_notifications(student_ids, message)

    # Step 2: Push to message queue for async processing
    # Each student gets their own job in the queue
    for student_id in student_ids:
        enqueue_job("send_notification", {
            student_id: student_id,
            message: message
        })

# Worker processes pick up jobs from the queue
function process_notification_job(job):
    student_id = job.student_id
    message = job.message

    # Try to send email with retry
    success = false
    attempts = 0
    while not success and attempts < 3:
        try:
            send_email(student_id, message)
            success = true
        catch error:
            attempts += 1
            wait(2 ** attempts seconds)  # exponential backoff
    
    if not success:
        log_failed_delivery(student_id, message)  # track for manual follow-up

    # Push to app (separate from email, doesn't block it)
    push_to_app(student_id, message)
```

**Why this is better:**
- DB write is decoupled from email delivery
- If email fails, the notification is still visible in the app
- Workers can retry failed emails independently
- Multiple workers can process the queue in parallel (fast)
- Failed deliveries are tracked for follow-up
- The queue survives server restarts

---

## Stage 6

### Priority Inbox Implementation

**Approach:**

I fetch all notifications from the API and compute a priority score for each one. The score is calculated as:

```
score = (type_weight * 10) + normalized_recency
```

Where:
- `type_weight`: Placement = 3, Result = 2, Event = 1
- `normalized_recency`: a value between 0 and 1, where 1 = newest

Multiplying the type weight by 10 ensures that type is the dominant factor, while recency acts as a tiebreaker for notifications of the same type. So two Placement notifications are both scored higher than any Result notification, but between two Placements, the more recent one comes first.

The top N notifications (configurable, default 10) are then displayed in the priority inbox.

**Code:** See `campus_notifications/priority_inbox.js`

**How new notifications are handled efficiently:**

Since we fetch fresh from the API every time, new notifications are always included. If we wanted to maintain a persistent "top 10" that updates as new notifications come in, we could use a **min-heap of size N**. We'd iterate through all notifications once, and for each one, if its score is higher than the current minimum in the heap, we swap it in. This keeps memory usage at O(N) regardless of how many total notifications there are.
