# Task Manager API

[![CI](https://github.com/chokrikadoussi/task-manager-api/actions/workflows/ci.yml/badge.svg)](https://github.com/chokrikadoussi/task-manager-api/actions/workflows/ci.yml)

A RESTful API for task management built with Node.js, Express, TypeScript, Prisma and PostgreSQL. Features JWT authentication, role-based task ownership, request validation, structured logging, and security hardening.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Features

- **JWT Authentication** — register, login, token-based access
- **Task CRUD** — create, read, update, delete with ownership checks
- **Filters & Pagination** — filter by status, assignee, page and limit
- **Request Validation** — Zod schemas with centralized validation middleware
- **Error Handling** — global error handler with typed AppError, Prisma and Zod error mapping
- **Structured Logging** — Winston logger with Morgan HTTP request logging
- **Security** — Helmet headers, CORS whitelist, rate limiting (global + auth routes), HTTPS redirect in production

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express 5 |
| Language | TypeScript 5 (strict mode) |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Validation | Zod 4 |
| Auth | JSON Web Tokens |
| Logging | Winston + Morgan |
| Security | Helmet, express-rate-limit, CORS |
| Testing | Jest 30 + Supertest + ts-jest |
| CI/CD | GitHub Actions |
| Deployment | Render |

---

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL (local or via Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/chokrikadoussi/task-manager-api.git
cd task-manager-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Database Setup

```bash
# Start PostgreSQL with Docker (optional)
npm run docker:up

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### Run

```bash
# Development (watch mode)
npm run dev

# Production
npm run build && npm start
```

The API will be available at `http://localhost:3000`.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `default_secret_key` |
| `JWT_EXPIRES_IN_SECONDS` | Token expiration in seconds | `900` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `LOG_LEVEL` | Winston log level (`error`, `warn`, `info`, `http`) | `http` |

> **Never commit secrets.** Copy `.env.example` to `.env` and fill in your values.

---

## API Reference

### Authentication

#### `POST /auth/register`

Create a new user account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response `201`:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe"
}
```

---

#### `POST /auth/login`

Authenticate and receive a JWT token.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Tasks

All task endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

#### `POST /tasks`

Create a new task assigned to the authenticated user.

**Request body:**
```json
{
  "title": "My task",
  "description": "Optional description"
}
```

**Response `201`:** Task object.

---

#### `GET /tasks`

List tasks with optional filters and pagination.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | `pending` \| `in_progress` \| `completed` | Filter by status |
| `assignedToId` | `number` | Filter by assigned user |
| `page` | `number` | Page number (default: `1`) |
| `limit` | `number` | Items per page (default: `10`) |

**Response `200`:**
```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

---

#### `PATCH /tasks/:id`

Update a task. Only the assigned user can update their own tasks.

**Request body** (all fields optional):
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "in_progress"
}
```

**Response `200`:** Updated task object.

---

#### `DELETE /tasks/:id`

Delete a task. Only the assigned user can delete their own tasks.

**Response `204`:** No content.

---

### Error Responses

All errors follow a consistent format:

```json
{
  "message": "Error description"
}
```

| Status | Meaning |
|---|---|
| `400` | Validation error or bad request |
| `401` | Missing or invalid authentication |
| `403` | Forbidden — not the task owner |
| `404` | Resource not found |
| `409` | Conflict — unique constraint violation |
| `429` | Too many requests — rate limit exceeded |
| `500` | Internal server error |

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Create and apply a new migration |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run docker:up` | Start PostgreSQL via Docker Compose |
| `npm run docker:down` | Stop Docker containers |

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests use Jest with Supertest for HTTP integration testing. Prisma and bcrypt-ts are mocked to keep tests fast and isolated.

**Current coverage:** 17 tests across 2 test suites.

---

## Deployment

The API is deployed on [Render](https://render.com).

### Render setup

**Build command:**
```
npm ci --include=dev && npm run db:generate && npm run db:deploy && npm run build
```

**Start command:**
```
npm start
```

**Environment variables to configure in Render:**

- `DATABASE_URL` — your Render PostgreSQL internal URL
- `JWT_SECRET` — strong random secret
- `NODE_ENV` — `production`
- `CORS_ORIGIN` — your frontend URL

---

## License

MIT — [Chokri Kadoussi](https://github.com/chokrikadoussi)
