# TaskFlow Backend

> High-performance, scalable Node.js & TypeScript REST API backend for **TaskFlow** powered by Prisma ORM and PostgreSQL.

TaskFlow Backend manages user authentication, project collaboration, task tracking, subtasks, notification dispatching, project invitation workflows, and AI Agent assistance with proposal execution.

---

## 🚀 1. Overview & Key Features

* **Authentication & Authorization**
  * JWT-based Access & Refresh Token rotation.
  * Password hashing using bcrypt.
  * Google OAuth 2.0 integration.
* **Project Management & Collaboration**
  * Project CRUD operations with role-based access (`owner`, `member`).
  * Email-based project invitation system with token expiration.
* **Task & Subtask System**
  * Task creation, assignment, priority levels (`low`, `medium`, `high`), due dates, and status progression (`todo`, `in_progress`, `done`).
  * Interactive subtasks checklist per task.
* **Real-time Notifications**
  * Automatic notification generation for task assignments, updates, deadlines, and project invitations.
  * Read / Unread state tracking and bulk mark-all-read.
* **AI Agent Workspace Assistant**
  * Conversation history tracking (`AiConversation`, `AiMessage`).
  * Action proposal drafting (`AiDraftProposal`) for automated multi-step task creation, project planning, and workload analysis.
* **Dashboard Analytics**
  * Aggregated user stats (total tasks, done, in progress, high priority).
  * Upcoming deadlines querying with pagination.

---

## 🛠️ 2. Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Language** | TypeScript (Strict) |
| **Runtime** | Node.js (v20+) |
| **Framework** | Express.js |
| **Database ORM** | Prisma ORM |
| **Database** | PostgreSQL |
| **Validation** | Zod |
| **Containerization** | Docker & Docker Compose |

---

## 📋 3. Environment Variables

Create a `.env` file in `taskflow-backend/` based on `.env.example`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow?schema=public"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
FRONTEND_URL="http://localhost:3000"
```

---

## 🏁 4. Running Locally

### Option A — Docker Compose (Recommended)

```bash
# Build and spin up PostgreSQL and Backend container
docker compose up --build -d
```

### Option B — Manual Setup (pnpm)

```bash
# 1. Install dependencies
pnpm install

# 2. Run Prisma database migrations
npx prisma migrate dev --name init

# 3. Seed database (optional)
npx prisma db seed

# 4. Start development server
pnpm dev
```

---

## 📡 5. API Endpoints Overview

### Auth
* `POST /auth/register` — Register new user
* `POST /auth/login` — Login user (returns JWT & refresh token)
* `POST /auth/google` — Google OAuth authentication
* `GET /auth/me` — Current authenticated user profile
* `PATCH /auth/profile` — Update user profile

### Projects & Members
* `GET /projects` — List user projects (paginated)
* `POST /projects` — Create project
* `GET /projects/:id` — Get project details
* `PATCH /projects/:id` — Update project
* `DELETE /projects/:id` — Delete project
* `GET /projects/:id/members` — List project members
* `POST /projects/:id/members` — Add member to project
* `DELETE /projects/:id/members/:userId` — Remove member from project

### Project Invitations
* `POST /projects/:id/invitations` — Send email invitation to project
* `GET /invitations/:token` — Validate invitation token
* `POST /invitations/:token/accept` — Accept invitation

### Tasks & Subtasks
* `GET /projects/:id/tasks` — List project tasks (filterable by status)
* `POST /projects/:id/tasks` — Create task
* `PATCH /tasks/:id` — Update task status, priority, assignee, due date
* `DELETE /tasks/:id` — Delete task
* `POST /tasks/:id/subtasks` — Add subtask to task
* `PATCH /subtasks/:id` — Toggle subtask completion status
* `DELETE /subtasks/:id` — Delete subtask

### Notifications
* `GET /notifications` — List user notifications
* `PATCH /notifications/:id/read` — Mark single notification read
* `POST /notifications/read-all` — Mark all notifications read

### Dashboard & Analytics
* `GET /stats` — User workspace summary stats
* `GET /deadlines` — Paginated list of upcoming deadlines

### AI Agent Assistant
* `POST /ai/chat` — Send prompt to AI agent
* `GET /ai/conversations` — List AI conversations
* `GET /ai/proposals` — List pending draft proposals
* `POST /ai/proposals/:id/execute` — Execute AI draft proposal actions

---

## 📄 6. License

This project is licensed under the **MIT License**. See [`LICENSE`](./LICENSE) for full details.
