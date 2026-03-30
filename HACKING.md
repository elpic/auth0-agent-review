# Hacking Guide

Everything you need to go from zero to running, understand the codebase, and start contributing.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22+ | `mise install` or `nvm use` |
| npm | 10+ | bundled with Node |
| Git | any | — |

> This project uses [`mise`](https://mise.jdx.dev/) for toolchain pinning. Run `mise install` at the root to get the exact Node version.

---

## First-time setup

```bash
# 1. Clone
git clone git@github.com:elpic/auth0-agent-review.git
cd auth0-agent-review

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# → Fill in all values (see "Environment variables" section below)

# 4. Run the database migration
npx prisma migrate dev

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

The minimum set to get the app running locally:

```bash
# Generate with: openssl rand -hex 32
AUTH0_SECRET=...

AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

# Auth0 Token Vault (from Auth0 AI dashboard — requires early access)
AUTH0_TOKEN_VAULT_URL=https://your-tenant.us.auth0.com/api/v2

# GitHub OAuth App (github.com → Settings → Developer Settings → OAuth Apps)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Slack OAuth App (api.slack.com → Your Apps)
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# AI provider — OpenAI is the default
OPENAI_API_KEY=sk-...

# SQLite (no change needed for local dev)
DATABASE_URL="file:./dev.db"
```

**Don't have Token Vault access yet?** The `getGitHubToken()` and `getSlackToken()` helpers in `src/lib/token-vault.ts` can be stubbed with a hardcoded token during local development. See "Working without Token Vault" below.

---

## Auth0 tenant setup (one-time)

1. Go to [manage.auth0.com](https://manage.auth0.com) and create a **Regular Web Application**
2. Under **Settings**:
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
3. Under **Advanced Settings → Grant Types**: enable **Refresh Token** + **Refresh Token Rotation**
4. **Connections → Social**:
   - Add **GitHub** — use your `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
   - Add **Slack** — use your `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`
5. Request **Token Vault** access at [auth0.com/ai](https://auth0.com/ai) — paste the vault URL into `AUTH0_TOKEN_VAULT_URL`

---

## Codebase map

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[auth0]/route.ts   ← Auth0 catch-all (login, logout, callback)
│   │   ├── agent/review/route.ts   ← POST: trigger a PR review
│   │   └── audit/route.ts          ← GET: fetch audit log for current user
│   ├── audit/page.tsx              ← Audit trail UI
│   ├── dashboard/page.tsx          ← Main UI (connect services, run reviews)
│   ├── layout.tsx                  ← Root layout + Navbar
│   └── page.tsx                    ← Landing page
├── components/
│   ├── ui/                         ← shadcn/ui primitives (Button, Card, Badge…)
│   ├── audit-table.tsx             ← Audit log table with polling
│   ├── navbar.tsx                  ← Top nav with auth state
│   ├── review-form.tsx             ← PR URL form (client component)
│   └── service-connection-card.tsx ← GitHub/Slack connect/disconnect cards
└── lib/
    ├── agent.ts        ← AI agent loop (Vercel AI SDK + tools)
    ├── audit.ts        ← logAction() helper — write to AuditLog table
    ├── auth0.ts        ← Auth0 singleton (auth0.getSession(), auth0.middleware)
    ├── prisma.ts       ← Prisma singleton (prevents connection leaks in dev)
    ├── token-vault.ts  ← getGitHubToken() / getSlackToken() via Token Vault
    └── utils.ts        ← cn(), formatDateTime(), truncate()

prisma/
├── schema.prisma       ← AuditLog + ConnectedService models
└── migrations/         ← Migration history (committed)
```

---

## Key flows to understand

### 1. Authentication
`src/proxy.ts` (Next.js middleware) protects `/dashboard` and `/audit`. Any unauthenticated request redirects to Auth0 login. The Auth0 SDK handles the full PKCE flow via the `[auth0]` catch-all route.

### 2. Agent trigger
`POST /api/agent/review` is the entry point. It:
1. Validates the session (`auth0.getSession()`)
2. Gets GitHub + Slack tokens from Token Vault
3. Calls `runReview()` from `src/lib/agent.ts`
4. Logs every step to `AuditLog` via `logAction()`

### 3. Agent loop
`src/lib/agent.ts` uses Vercel AI SDK `generateText` with three tools:
- `fetchPRDetails` — calls GitHub REST API for PR diff/metadata
- `fetchSlackContext` — calls Slack API for channel messages
- `postReviewComment` — posts review back to GitHub (write action, requires step-up)

### 4. Audit trail
Every `logAction()` call writes a row to the SQLite `AuditLog` table. The `/audit` page polls `GET /api/audit` every 3 seconds while an agent run is active.

### 5. Step-up auth
Before `postReviewComment` executes, the API verifies the session has a recent MFA challenge (`acr` claim). If not, the client is redirected through an Auth0 step-up authorization request.

---

## Useful commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint

npx prisma studio        # Database GUI (http://localhost:5555)
npx prisma migrate dev   # Apply schema changes + regenerate client
npx prisma db push       # Push schema without creating a migration (prototyping)
npx prisma generate      # Regenerate Prisma client after schema edit
```

---

## Working without Token Vault

If you don't have Token Vault access yet, stub the helpers in `src/lib/token-vault.ts`:

```ts
export async function getGitHubToken(_userId: string): Promise<string> {
  // Return a personal access token for local dev
  return process.env.DEV_GITHUB_TOKEN!
}

export async function getSlackToken(_userId: string): Promise<string> {
  return process.env.DEV_SLACK_TOKEN!
}
```

Add `DEV_GITHUB_TOKEN` and `DEV_SLACK_TOKEN` to `.env.local`. This unblocks local development while you wait for Token Vault early access.

---

## Adding a new agent tool

1. Define the tool in `src/lib/agent.ts` using the Vercel AI SDK `tool()` helper:

```ts
import { tool } from 'ai'
import { z } from 'zod'

const myTool = tool({
  description: 'What this tool does',
  parameters: z.object({
    param: z.string().describe('What this param is'),
  }),
  execute: async ({ param }, { userId }) => {
    await logAction(userId, 'my_tool_action', 'github', 'pending')
    // ... do the work
    await logAction(userId, 'my_tool_action', 'github', 'success')
    return result
  },
})
```

2. Add it to the `tools` object in the `generateText` call.
3. Add a new `AuditLog` `action` value to the Prisma schema if needed, then run `npx prisma migrate dev`.

---

## Database schema

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String           // e.g. "fetch_pr_details", "post_review_comment"
  service   String           // "github" | "slack" | "agent" | "auth"
  status    String           // "pending" | "success" | "error"
  details   String?          // JSON blob
  error     String?
  createdAt DateTime @default(now())
}

model ConnectedService {
  id        String   @id @default(cuid())
  userId    String
  service   String           // "github" | "slack"
  scope     String?          // OAuth scopes granted
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, service])
}
```

---

## Branching

- `main` — always deployable
- Feature branches: `feat/<short-description>`
- Bug fixes: `fix/<short-description>`

Open a PR against `main`. No force-pushes to `main`.
