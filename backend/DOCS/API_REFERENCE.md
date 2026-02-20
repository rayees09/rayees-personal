# API Reference

**Base URL:** `http://localhost:8000`
**Authentication:** Bearer Token (JWT)
**Content-Type:** `application/json`

---

## Authentication

All endpoints (except registration/login) require authentication:

```
Authorization: Bearer <access_token>
```

---

## Endpoints Overview

| Router | Prefix | Endpoints | Auth Required |
|--------|--------|-----------|---------------|
| Auth | `/api/auth` | 7 | Partial |
| Family | `/api/family` | 12 | Partial |
| Admin | `/api/admin` | 22 | Admin Token |
| Tasks | `/api/tasks` | 10 | User Token |
| Islamic | `/api/islamic` | 21+ | User Token |
| Learning | `/api/learning` | 12+ | User Token |
| Quran Goals | `/api/quran-goals` | 8+ | User Token |
| Reminders | `/api/reminders` | 6 | User Token |
| Expenses | `/api/expenses` | 8 | User Token |
| Support | `/api/support` | 6 | Partial |
| AI Context | `/api/ai` | 2 | User Token |

**Total: 113+ endpoints**

---

## Auth Endpoints

### POST /api/auth/login
Login with email/password or username/password.

**Request:**
```json
{
  "email": "parent@example.com",
  "password": "SecurePass123",
  "username": null
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Parent Name",
    "email": "parent@example.com",
    "role": "parent",
    "total_points": 100
  }
}
```

### GET /api/auth/me
Get current authenticated user.

**Response:**
```json
{
  "id": 1,
  "name": "Parent Name",
  "email": "parent@example.com",
  "role": "parent",
  "family_id": 1
}
```

### GET /api/auth/family
Get all family members for current user.

**Response:**
```json
[
  {"id": 1, "name": "Parent", "role": "parent"},
  {"id": 2, "name": "Child 1", "role": "child"},
  {"id": 3, "name": "Child 2", "role": "child"}
]
```

---

## Family Endpoints

### POST /api/family/register
Register a new family.

**Request:**
```json
{
  "family_name": "Smith Family",
  "owner_name": "John Smith",
  "owner_email": "john@example.com",
  "password": "SecurePass123",
  "country": "USA"
}
```

**Response:**
```json
{
  "family_id": 1,
  "family_name": "Smith Family",
  "owner_email": "john@example.com",
  "message": "Registration successful! Please check your email to verify.",
  "requires_verification": true
}
```

### POST /api/family/verify-email
Verify email with token.

**Request:**
```json
{
  "token": "verification_token_from_email"
}
```

### GET /api/family/me
Get current family details with features and AI limits.

### POST /api/family/members
Add a new family member (Parents only).

**Request:**
```json
{
  "name": "Child Name",
  "username": "childusername",
  "password": "ChildPass123",
  "role": "child",
  "dob": "2015-05-10",
  "grade": "5th"
}
```

### DELETE /api/family/members/{member_id}
Remove a family member (Parents only).

---

## Tasks Endpoints

### GET /api/tasks
Get tasks with optional filters.

**Query Parameters:**
- `assigned_to` (int): Filter by assignee
- `status` (string): pending, completed, verified
- `category` (string): Filter by category
- `due_date` (date): Filter by due date

### POST /api/tasks
Create a new task.

**Request:**
```json
{
  "title": "Clean room",
  "description": "Clean and organize bedroom",
  "assigned_to": 2,
  "due_date": "2026-02-25T18:00:00",
  "points": 10,
  "category": "chores"
}
```

### POST /api/tasks/{task_id}/complete
Mark task as completed (awards points).

### POST /api/tasks/{task_id}/verify
Verify a completed task (Parents only).

### GET /api/tasks/points/{user_id}
Get user's points balance and history.

**Response:**
```json
{
  "user_id": 2,
  "total_points": 150,
  "recent_points": [
    {"points": 10, "reason": "Completed task: Clean room", "created_at": "..."}
  ]
}
```

### GET /api/tasks/rewards
List available rewards.

### POST /api/tasks/rewards/{reward_id}/redeem
Redeem a reward using points.

---

## Islamic Practice Endpoints

### GET /api/islamic/prayers/{user_id}/{date}
Get daily prayers for a user.

**Response:**
```json
{
  "date": "2026-02-20",
  "user_id": 2,
  "prayers": [
    {"id": 1, "prayer_name": "fajr", "status": "prayed", "in_masjid": true},
    {"id": 2, "prayer_name": "dhuhr", "status": "not_prayed", "in_masjid": false}
  ],
  "completed_count": 3,
  "total_count": 5
}
```

### POST /api/islamic/prayers
Log a prayer.

**Request:**
```json
{
  "user_id": 2,
  "prayer_name": "fajr",
  "date": "2026-02-20",
  "status": "prayed",
  "in_masjid": true
}
```

### GET /api/islamic/quran/{user_id}
Get Quran memorization progress.

### POST /api/islamic/quran
Add surah progress.

**Request:**
```json
{
  "user_id": 2,
  "surah_number": 114,
  "surah_name": "An-Nas",
  "total_verses": 6,
  "verses_memorized": 6,
  "status": "memorized"
}
```

### GET /api/islamic/ramadan/{user_id}
Get Ramadan log for a user.

### POST /api/islamic/ramadan
Log a Ramadan day.

**Request:**
```json
{
  "user_id": 2,
  "date": "2026-03-01",
  "fasted": true,
  "taraweeh": true,
  "quran_pages": 5
}
```

### GET /api/islamic/ramadan/{user_id}/summary
Get Ramadan summary statistics.

---

## Learning Endpoints

### POST /api/learning/homework/upload
Upload homework image for AI analysis.

**Request:** `multipart/form-data`
- `file`: Image file
- `user_id`: Child's user ID
- `title`: Optional title

**Response:**
```json
{
  "id": 1,
  "score": 85,
  "questions_found": 10,
  "correct_answers": 8,
  "feedback": "Good work! Focus on...",
  "topics_identified": ["Fractions", "Division"]
}
```

### GET /api/learning/homework/{user_id}
Get homework history.

### POST /api/learning/worksheet/generate
Generate a practice worksheet using AI.

**Request:**
```json
{
  "user_id": 2,
  "subject": "Math",
  "topic_name": "Fractions",
  "difficulty": "medium",
  "question_count": 10
}
```

### GET /api/learning/proficiency/{user_id}
Get proficiency scores by subject/topic.

### GET /api/learning/weak-areas/{user_id}
Get areas needing improvement.

---

## Quran Goals Endpoints

### POST /api/quran-goals/create
Create a new Quran reading goal.

**Request:**
```json
{
  "title": "Complete Quran in Ramadan",
  "target_days": 30,
  "start_date": "2026-03-01",
  "total_pages": 604
}
```

### GET /api/quran-goals/active
Get active goal for current user or specified user.

**Query:** `?user_id=2`

### POST /api/quran-goals/log
Log reading progress.

**Request:** `multipart/form-data`
- `pages_read`: Number of pages
- `start_page`: Optional
- `end_page`: Optional
- `file`: Optional image of Quran page

### GET /api/quran-goals/stats
Get detailed reading statistics.

---

## Admin Endpoints

**All admin endpoints require admin authentication.**

### POST /api/admin/login
Admin login.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "AdminPass123"
}
```

### GET /api/admin/dashboard
Get system dashboard stats.

**Response:**
```json
{
  "total_families": 10,
  "total_users": 45,
  "active_families": 8,
  "total_ai_usage": 50000
}
```

### GET /api/admin/families
List all families (paginated).

**Query:** `?page=1&page_size=20`

### PUT /api/admin/families/{id}/status
Activate or deactivate a family.

### PUT /api/admin/families/{id}/ai-limits
Set AI usage limits for a family.

**Request:**
```json
{
  "monthly_token_limit": 100000,
  "monthly_cost_limit_usd": 0.50
}
```

---

## AI Context Endpoints

### GET /api/ai/context
Get comprehensive family data for AI/ChatGPT integration.

**Note:** Only returns data for the requesting user's family.

**Response:**
```json
{
  "generated_at": "2026-02-20T10:00:00",
  "family": [...],
  "tasks": {...},
  "islamic_practices": {...},
  "summary_text": "Family Summary..."
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Only parents can perform this action"
}
```

### 404 Not Found
```json
{
  "detail": "User not found in your family"
}
```

### 429 Too Many Requests
```json
{
  "detail": "AI token limit exceeded for this month"
}
```

---

## Rate Limits

Currently no rate limiting implemented. Recommended for production:
- Auth endpoints: 5 requests/minute
- Admin endpoints: 30 requests/minute
- General endpoints: 100 requests/minute
