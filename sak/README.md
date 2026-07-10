# Cloud File Storage

Full-stack cloud file storage starter app with React frontend, Express backend, MongoDB metadata, and AWS S3 file storage integration.

## Features

- User authentication with JWT
- File upload with drag/drop UI
- File browsing and search
- Metadata and folder support
- Share token generation
- Presigned downloads for secure access
- Responsive dashboard UI

## Setup

1. Install dependencies

   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install`

2. Create environment variables

   Copy `backend/.env.example` to `backend/.env` and fill in values.

3. Start development servers

   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`

4. Open `http://localhost:5173`

## Notes

- The backend expects MongoDB available on `MONGO_URI`.
- S3 storage requires AWS credentials and a bucket configured.
- The frontend proxies `/api` to the backend on port 4000.
- The AI assistant can use OpenAI if `OPENAI_API_KEY` is set in `backend/.env`. Otherwise it uses an advanced local fallback.

## Smoke test script

- A small smoke-test script is included at `scripts/smoke_test.js` that registers a temporary user, sends a chat message, and lists conversations. It does not run automatically — run it manually when servers are up.

Run it from the project root (requires `node` and `npm install axios` if not present):

```bash
cd scripts
node smoke_test.js
```
