# workflow.ai

Hackathon project for a web dashboard orchestrating Jira + GitHub AI workflows.

## Project layout

| Path              | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `apps/dashboard`  | Next.js App Router client (idea capture, workflow chat, Jira/GitHub handoff) |
| `apps/server`     | Fastify backend exposing `/api/chat` (future MCP/Jira/GitHub integrations)   |

## Dashboard (client)

```bash
cd apps/dashboard
npm install
npm run dev          # or npm run dev:open to auto-launch the browser
```

The client proxies chat requests through its API route to the backend. Override
the target via `apps/dashboard/.env.local`:

```
CHAT_API_BASE_URL=http://localhost:4000
```

## Backend (server)

```bash
cd apps/server
npm install
npm run dev
```

The Fastify server listens on `http://localhost:4000` by default and exposes:

- `GET /healthz` – simple health check
- `POST /api/chat` – returns a canned assistant response (placeholder for MCP/Jira logic)
- `POST /api/jira/issues` – creates Jira issues using the configured project

Create `apps/server/.env` (never commit it) with:

```
JIRA_BASE_URL=https://<your-domain>.atlassian.net
JIRA_PROJECT_KEY=SCRUM
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your_api_token

# Optional: Confluence settings (if different from Jira)
# If not set, will use Jira credentials and URL
CONFLUENCE_BASE_URL=https://<your-domain>.atlassian.net/wiki
CONFLUENCE_SPACE_KEY=YOUR_SPACE_KEY
CONFLUENCE_EMAIL=you@example.com
CONFLUENCE_API_TOKEN=your_api_token
```

**Need help finding these values?**
- See [GET_JIRA_CREDENTIALS.md](./GET_JIRA_CREDENTIALS.md) for API token and project key
- See [WHERE_TO_GET_CREDENTIALS.md](./WHERE_TO_GET_CREDENTIALS.md) for Confluence values

The dashboard proxy reuses `CHAT_API_BASE_URL`/`SERVER_BASE_URL` to reach both chat
and Jira endpoints.

## Creating Shared Jira + Confluence Space

To set up a space shared between Jira and Confluence:

1. See detailed guide: [CREATE_SHARED_SPACE.md](./CREATE_SHARED_SPACE.md)
2. Quick version:
   - Create Jira space with key (e.g., `ENG`)
   - Create Confluence space with **same** key (`ENG`)
   - Link them together in space settings
   - Use the key in your `.env`: `JIRA_PROJECT_KEY=ENG`

## Run entire stack

From the repo root you can boot both services concurrently:

```bash
npm install          # once, install workspace dependencies
npm run dev:stack    # starts server + client
npm run dev:stack:open   # same as above but opens http://localhost:3000
```

When deploying, set `SERVER_BASE_URL` or `CHAT_API_BASE_URL` so the dashboard
knows where to reach the backend.
