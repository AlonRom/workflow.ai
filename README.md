# workflow.ai

Hackathon project for a web dashboard orchestrating Jira + GitHub AI workflows.

## Apps

- `apps/dashboard/` – Next.js App Router dashboard with Tailwind styling. It
  prototypes the idea capture flow, MCP conversation builder, and integration
  hand-offs to Jira + GitHub Copilot.
- `apps/server/` – Fastify backend that exposes `/api/chat` (and later MCP,
  Jira, GitHub integrations). The dashboard proxies through this backend.

## Getting started

```bash
cd apps/dashboard
npm install
npm run dev
```

> If the default npm CLI fails in your environment, you can use `pnpm` or `yarn`
> instead; the project does not depend on a specific package manager.

For a one-command launch that auto-opens your browser:

```bash
npm run dev:open
```

### Backend

```bash
cd apps/server
npm install
npm run dev
```

By default the dashboard proxies chat requests to `http://localhost:4000/api/chat`.
Override with `CHAT_API_BASE_URL` (or `SERVER_BASE_URL`) in `apps/dashboard/.env.local`
when deploying.

### Run entire stack + open browser

From the repo root you can boot both services at once (backend + dashboard) and
auto-open the browser:

```bash
npm install  # once, to install workspace deps
npm run dev:stack:open
```

If you only want both servers without auto-opening the browser, use
`npm run dev:stack`.
