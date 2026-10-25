# Online Examination & Proctoring System

A full-stack MERN web application for conducting secure online examinations with browser-based proctoring, automatic grading, and role-based access control.

---

## 📋 Project Overview

**Problem Statement:** Traditional pen-and-paper examinations are difficult to scale and monitor remotely. This system provides a secure, configurable platform for educational institutions to conduct online exams with automated grading and optional proctoring.

**Key Features:**
- 🔐 Role-based access: Admin, Teacher, Student
- 📝 Exam creation with MCQ, True/False, Short Answer, and Descriptive questions
- ⏱️ Server-authoritative exam timer (client cannot cheat by manipulating time)
- 🤖 Automatic grading of objective questions
- 📊 Results analytics for teachers
- 👁️ Browser-based proctoring (tab switching, face detection, fullscreen monitoring)
- 🔍 Teacher proctoring review dashboard
- 📋 Admin audit logs

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS v3, React Router v6 |
| State / Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP Client | Axios (with cookie credentials) |
| Proctoring | MediaPipe Face Detector, MediaDevices API, Page Visibility API |
| Real-time | Socket.IO (Phase 8) |
| Backend | Node.js 20 + Express 4 |
| Auth | JWT (httpOnly cookies, 15 min access + 7 day refresh) |
| Validation | Zod |
| Database | MongoDB 7 + Mongoose 8 |
| Security | Helmet, CORS, express-rate-limit, bcryptjs |
| Testing | Vitest + Testing Library (frontend), Jest + Supertest (backend) |

---

## 🚀 Quick Start

### Prerequisites

```powershell
node -v     # Must be v20+
npm -v      # Must be v10+
mongod --version  # MongoDB 7+ (or use Atlas)
```

Install Node.js 20 LTS from https://nodejs.org  
Install MongoDB Community 7 from https://www.mongodb.com/try/download/community  
*(OR use MongoDB Atlas free tier — no local install needed)*

---

### 1. Clone and Navigate

```powershell
cd "c:\Users\ANKIT PATEL\OneDrive\Documents\Desktop\SEM -5\JsFramework\online-examination-proctoring"
```

### 2. Configure Environment

```powershell
# The .env file is already created for you in development.
# Review it and update MONGODB_URI if using Atlas:
notepad server\.env
```

**MongoDB Atlas URI format:**
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/exam_proctoring?retryWrites=true&w=majority
```

### 3. Start MongoDB (local only)

```powershell
# Windows — start as a service or run directly:
mongod --dbpath "C:\data\db"
```

### 4. Install and Run the Backend

```powershell
cd server
npm install        # Already done if you followed setup
npm run dev        # Starts on http://localhost:5000
```

### 5. Seed the Admin Account (first time only)

```powershell
# In a separate terminal, from the server/ directory:
npm run seed:admin
# Output: admin@examportal.dev / Admin@1234!
```

### 6. Install and Run the Frontend

```powershell
# In a separate terminal:
cd client
npm install        # Already done if you followed setup
npm run dev        # Starts on http://localhost:5173
```

### 7. Open the App

- **Design Showcase (Phase 1):** http://localhost:5173/showcase
- **Health Check:** http://localhost:5000/api/health

---

## 📁 Project Structure

```
online-examination-proctoring/
├── client/                    React + Vite frontend
│   └── src/
│       ├── api/               Axios client + per-feature API modules
│       ├── components/ui/     Design system: Button, Card, Modal, etc.
│       ├── features/          auth/ admin/ teacher/ student/ proctoring/
│       ├── hooks/             useCountdownTimer, useAnswerSync, etc.
│       ├── layouts/           AuthLayout, DashboardLayout, ExamLayout
│       ├── pages/             Route-level page components
│       ├── routes/            React Router config + ProtectedRoute
│       └── utils/             cn, formatDate, scoreUtils
│
└── server/                    Express + MongoDB backend
    └── src/
        ├── config/            db.js, env.js (Zod-validated)
        ├── models/            User, Exam, Question, ExamAttempt,
        │                      ProctoringEvent, AuditLog
        ├── controllers/       Request handlers
        ├── routes/            Express routers
        ├── middleware/        authenticate, authorize, validate, auditLog
        ├── services/          Business logic (grading, attempt, proctoring)
        ├── validators/        Zod schemas
        └── utils/             ApiError, ApiResponse, logger
```

---

## 🔐 Environment Variables

### server/.env

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Express server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/exam_proctoring` |
| `CLIENT_URL` | Frontend origin (no trailing slash) | `http://localhost:5173` |
| `JWT_ACCESS_SECRET` | Secret for 15-min access tokens | 64-char hex string |
| `JWT_REFRESH_SECRET` | Secret for 7-day refresh tokens | Different 64-char hex string |
| `BCRYPT_ROUNDS` | Password hashing cost | `12` |
| `SEED_ADMIN_EMAIL` | Admin email for seed script | `admin@examportal.dev` |
| `SEED_ADMIN_PASSWORD` | Admin password for seed script | Strong password |

Generate secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### client/.env

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL (Vite proxy handles this in dev) |

---

## 👤 Demo Accounts

After running `npm run seed:admin`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@examportal.dev | Admin@1234! |
| Teacher | Created via Admin panel | Set by admin |
| Student | Registered via /register | Self-registered |

> ⚠️ Change the admin password immediately after first login in any shared environment.

---

## 🧪 Running Tests

### Backend

```powershell
cd server
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- auth.test.js   # Single file
```

### Frontend

```powershell
cd client
npm test                    # Vitest run mode
npm run test:ui            # Vitest with browser UI
npx vitest --coverage      # Coverage report
```

---

## 🗄️ Database Schema Summary

| Collection | Purpose |
|---|---|
| `users` | All user accounts (Admin/Teacher/Student) |
| `exams` | Exam definitions, settings, proctoring config |
| `questions` | Per-exam questions (answerKey never sent to client) |
| `examattempts` | Student attempts with server-computed deadline |
| `proctoringevents` | Browser events recorded per attempt |
| `auditlogs` | Immutable log of privileged actions |

---

## 📡 API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Health check |
| POST | `/api/auth/register` | None | Create account |
| POST | `/api/auth/login` | None | Login + set cookies |
| POST | `/api/auth/logout` | Auth | Clear cookies |
| GET | `/api/auth/me` | Auth | Current user profile |
| GET | `/api/admin/dashboard` | Admin | Platform stats |
| GET | `/api/admin/users` | Admin | Paginated user list |
| POST | `/api/exams` | Teacher | Create exam |
| GET | `/api/exams/:id` | Auth | Exam details |
| POST | `/api/exams/:id/start` | Student | Start attempt |
| PUT | `/api/attempts/:id/answers` | Student | Save answers |
| POST | `/api/attempts/:id/submit` | Student | Submit exam |
| GET | `/api/attempts/:id/result` | Auth | View result |

Full API documentation added progressively through each phase.

---

## 🔒 Security Design

- Passwords hashed with bcrypt (cost factor 12)
- JWT access tokens in httpOnly, SameSite cookies (not localStorage)
- Correct answers stored server-side with `select: false` — never returned to clients
- Server enforces exam deadlines — client cannot extend time
- Every protected route checks authentication AND role/ownership server-side
- NoSQL injection prevented by Mongoose schema validation
- Rate limiting: 10 req/15 min on auth, 200 req/min globally
- Audit log records all privileged actions (activation, publishing, score changes)

---

## 📊 Implementation Phases

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Complete | Architecture, scaffold, design system |
| 2 | ✅ Complete | Auth, login, register, protected routes |
| 3 | ✅ Complete | Admin dashboard + user management |
| 4 | ✅ Complete | Teacher exam creation + question editor |
| 5 | ✅ Complete | Student exam interface |
| 6 | ✅ Complete | Answer saving, timer, submission, auto-grading |
| 7 | ✅ Complete | Results, manual eval, analytics |
| 8 | ✅ Complete | Proctoring (face detection, browser events, webcam) |
| 9 | ✅ Complete | Proctoring review, audit logs |
| 10 | ✅ Complete | Comprehensive backend & frontend tests, Error Boundary, documentation |
| 11 | ✅ Complete | Security hardening, real-time WebSockets, Docker containerization & deployment |

---

## 🎓 College Demonstration Walkthrough (Complete 3-Role Flow)

Follow this 5-minute live demonstration flow for presentations:

### 1. Admin Walkthrough (`admin@examportal.dev` / `Admin@1234!`)
1. Log in at `http://localhost:5173/login`.
2. Inspect the **Live Metrics**: Total registered users, active exams, total attempts, and system uptime.
3. Manage users: Filter by `TEACHER` or `STUDENT`, change account status (`ACTIVE` / `INACTIVE`).
4. Switch to the **Security Audit Trail** tab: View real-time immutable audit entries with actor IDs, action types (`EXAM_CREATED`, `USER_REGISTERED`, `RESULTS_RELEASED`), and timestamps.

### 2. Teacher Walkthrough (`prof.ahmad@college.edu` / `Teacher@1234!`)
1. Log in and create an exam: Set title, duration (e.g. 30 mins), start/end window, and toggle proctoring options (Webcam, Tab Switching, Fullscreen).
2. Add Questions: Create multiple-choice (MCQ) questions with answer keys and point values.
3. Publish Exam: Transitions status from `DRAFT` to `PUBLISHED` (enables student enrollment).
4. Review Submissions & Proctoring:
   - Click **Submissions** to view student attempts, scores, and adjust marks/feedback.
   - Click **Proctoring Logs** to inspect flagged incidents (e.g. `TAB_SWITCH`, `FULLSCREEN_EXIT`), mark them `REVIEWED` or `DISMISSED`.
   - Click **Release Results** to publish evaluated scorecards to students.
   - Click **Analytics** to view pass rates, class averages, and question-level difficulty breakdowns.

### 3. Student Walkthrough (`jane.student@examportal.dev` / `Student@1234!`)
1. Log in to `http://localhost:5173/student/dashboard`.
2. Find the published exam under **Available Exams** and click **Start Exam**.
3. Live Examination & Proctoring:
   - Accept proctoring permissions (webcam preview, fullscreen lock).
   - Notice the server-computed ticking timer and question palette navigation.
   - Select answers and observe incremental auto-saving.
   - Test proctoring: switch tabs or exit fullscreen to trigger a logged violation event.
4. Submit Exam: View instant auto-graded submission confirmation.
5. Score Review: Once released by the teacher, open the detailed breakdown with correct vs. chosen answers and teacher remarks.

---

## 🧪 Verification & Automated Testing

### Backend Integration Tests (Jest + Supertest)
```powershell
cd server
npm test
# Runs 17 API integration tests across Auth, Exam CRUD, Student Attempts, and Auto-Grading.
```

### Frontend Unit Tests (Vitest + Testing Library)
```powershell
cd client
npm test
# Runs 13 tests covering UI components (Button, Badge, Alert, ErrorBoundary) and utility formatting.
```

---

## 🐳 Production Deployment with Docker

The entire platform can be deployed with a single command using Docker and Docker Compose:

```powershell
# 1. Build and launch MongoDB, Backend API, and Nginx Frontend
docker compose up -d --build

# 2. View running containers
docker compose ps

# 3. Seed admin account inside the running server container
docker compose exec server npm run seed:admin

# 4. Access application
# Frontend: http://localhost
# Backend API: http://localhost:5000/api
# Healthcheck: http://localhost:5000/api/health
```

To stop all containers:
```powershell
docker compose down
```


