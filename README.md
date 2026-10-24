# Deadline API

The Deadline API is the backend service for the Deadline Counter app. It provides a JSON REST API for creating, viewing, updating, and deleting deadlines, and stores deadline data in MongoDB.

This repository contains the API only. The macOS and iPhone apps are separate frontend clients that communicate with it over HTTP; their source code and platform-specific setup belong in their own repositories. Links to those repositories can be added here once they are available.

## Features

- Create and manage deadlines through a REST API
- Store deadlines in MongoDB
- Validate request data and return JSON error responses
- Optionally use a client-generated `clientID` to make repeated create requests idempotent
- Provide a health-check endpoint

## Technology

- Node.js 24
- TypeScript
- Express 5
- MongoDB with Mongoose
- Vitest and Supertest for tests

## Requirements

- Node.js `>=24 <25`
- npm
- A MongoDB instance, local or hosted

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Set `MONGODB_URI` in `.env` to your MongoDB connection string. For example, a local MongoDB instance could use:

   ```dotenv
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/deadline_counter
   MONGODB_TEST_URI=mongodb://127.0.0.1:27017/deadline_test
   ```

   `MONGODB_TEST_URI` is required to run the test suite. It must point to a test database whose name contains `deadline_test`. Keep test data separate from development or production data.

4. Start the development server:

   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000` by default. Set `PORT` in `.env` to use another port.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API in development mode with automatic restarts |
| `npm test` | Run the test suite |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm start` | Run the compiled server from `dist/` |

To run the compiled server, build first:

```bash
npm run build
npm start
```

## API

All endpoints use the `/api` prefix and return JSON. The examples below assume the server is running locally on port `3000`.

### Health check

```http
GET /api/health
```

Example response:

```json
{
  "success": true,
  "message": "Deadline API is running"
}
```

### Deadline fields

| Field | Type | Required when creating? | Details |
| --- | --- | --- | --- |
| `clientID` | string | No | Optional client-generated identifier, 1–100 characters. Reusing it on create returns the existing record instead of creating a duplicate. It cannot be changed after creation. |
| `title` | string | Yes | Non-empty after trimming; maximum 200 characters. |
| `dueDate` | string | Yes | A date string that JavaScript can parse; ISO 8601 is recommended. |
| `isUrgent` | boolean | No | Defaults to `false`. |
| `category` | string | No | One of `Study`, `Work`, `Personal`, `Health`, or `Other`; defaults to `Other`. |
| `isCompleted` | boolean | No | Defaults to `false`. |

Records also include a MongoDB `_id`, plus `createdAt` and `updatedAt` timestamps.

### Create a deadline

```http
POST /api/deadlines
Content-Type: application/json
```

```bash
curl -X POST http://localhost:3000/api/deadlines \
  -H "Content-Type: application/json" \
  -d '{
    "clientID": "ios-deadline-001",
    "title": "Submit project",
    "dueDate": "2027-06-15T10:00:00.000Z",
    "isUrgent": true,
    "category": "Study",
    "isCompleted": false
  }'
```

Returns `201 Created` with the created deadline in `data`. If `clientID` is supplied and has already been used, the existing deadline is returned.

### List deadlines

```http
GET /api/deadlines
```

Deadlines are sorted by `dueDate` in ascending order. The response contains a `count` and a `data` array.

```bash
curl http://localhost:3000/api/deadlines
```

### Get one deadline

```http
GET /api/deadlines/:id
```

Returns `200 OK` and the deadline in `data`. An invalid ID returns `400 Bad Request`; a valid ID that does not exist returns `404 Not Found`.

```bash
curl http://localhost:3000/api/deadlines/DEADLINE_ID
```

### Update a deadline

```http
PUT /api/deadlines/:id
Content-Type: application/json
```

Updates only the fields provided. Send at least one supported field; `clientID` cannot be changed.

```bash
curl -X PUT http://localhost:3000/api/deadlines/DEADLINE_ID \
  -H "Content-Type: application/json" \
  -d '{"isCompleted": true}'
```

Returns `200 OK` with the updated deadline in `data`.

### Delete a deadline

```http
DELETE /api/deadlines/:id
```

```bash
curl -X DELETE http://localhost:3000/api/deadlines/DEADLINE_ID
```

Returns `200 OK` when deleted. A valid ID that does not exist returns `404 Not Found`.

### Errors

Errors use a JSON response with `success: false` and a message. Common status codes include:

| Status | Meaning |
| --- | --- |
| `400` | Invalid ID, invalid request body, or invalid field values |
| `404` | Deadline or route not found |
| `413` | Request body is larger than the 100 KB limit |
| `500` | Unexpected server error |

## Connecting the macOS and iPhone apps

The macOS and iPhone apps should remain separate frontend projects, each with its own platform-specific code, dependencies, build instructions, and release process. Both can use this API as their shared backend:

1. Start or deploy the API and make sure it can connect to MongoDB.
2. Configure each app with the API base URL, such as `http://localhost:3000` for a client running on the same computer as the local API.
3. Have the apps send and receive JSON using the endpoints described above.
4. For a physical iPhone or another device, use an API URL reachable from that device; its `localhost` refers to the device itself, not your development computer.

Keep the macOS and iPhone repository links here up to date once they are published. Do not put database credentials or other secrets in either frontend app; configure those on the API server.

## Project structure

```text
src/
  app.ts                  Express app and middleware
  server.ts               Server startup and shutdown
  config/
    db.ts                 MongoDB connection
  models/
    Deadline.ts           Deadline schema and categories
  routes/
    deadlineRoutes.ts     Deadline API endpoints
  app.test.ts             API tests
  testSetup.ts            Test database setup
```
