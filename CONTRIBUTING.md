# Contributing Guide

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

# 2. Install mise (if you don't have it)
curl https://mise.run | sh

# 3. Install correct Node version + project deps
mise install
mise run setup

# 4. Set up environment variables
cp .env.local.example .env.local
# → Fill in all values (see "Environment variables" section below)

# 5. Run the database migration
mise run prisma:migrate

# 6. Start the dev server
mise run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

The minimum set to get the app running locally:

```bash
# Generate with: openssl rand -hex 32
AUTH0_SECRET=...

AUTH0_BASE_URL=http://localhost:3000
# Just the domain, no https:// — e.g. dev-xxxxx.us.auth0.com
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

# Auth0 Token Vault endpoint (your Auth0 Management API URL)
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

---

## Auth0 tenant setup (one-time)

### 1. Create the application

1. Go to [manage.auth0.com](https://manage.auth0.com) → **Applications → Applications → Create Application**
2. Give it a name (e.g. `auth0-agent-review`)
3. Select **Regular Web Application** → click **Create**

### 2. Configure URLs

Under **Settings**:

| Field | Value |
|---|---|
| Allowed Callback URLs | `http://localhost:3000/auth/callback` |
| Allowed Logout URLs | `http://localhost:3000` |
| Allowed Web Origins | `http://localhost:3000` |

Click **Save Changes**.

### 3. Enable grant types

Under **Settings → Advanced Settings → Grant Types**, enable:

- **Authorization Code** (should already be on)
- **Refresh Token**
- **Token Vault** (needed for Token Vault to work)

### 4. Create a GitHub OAuth App

Go to **github.com → Settings → Developer Settings → OAuth Apps → New OAuth App**:

| Field | Value |
|---|---|
| Application name | `auth0-agent-review` (or anything) |
| Homepage URL | `https://your-tenant.us.auth0.com` |
| Authorization callback URL | `https://your-tenant.us.auth0.com/login/callback` |

Click **Register application**, then click **Generate a new client secret**. Copy the **Client ID** and **Client Secret** into `.env.local`.

### 5. Create a Slack App

Go to **api.slack.com/apps → Create New App → From scratch**:

1. Give it a name and pick a development workspace
2. Under **OAuth & Permissions → Redirect URLs**, add: `https://your-tenant.us.auth0.com/login/callback`
3. Under **OAuth & Permissions → User Token Scopes**, add: `channels:history`, `channels:read`, `groups:read`
4. Under **Basic Information**, copy the **Client ID** and **Client Secret** into `.env.local`

### 6. Add social connections in Auth0

Go to **Authentication → Social → Create Connection** and add GitHub, then Slack.

For each connection:

1. Paste in the **Client ID** and **Client Secret** from the OAuth app you created above
2. Under **Purpose**, select **"Authentication and Connected Accounts for Token Vault"**
   - This enables both user login AND Token Vault access — you need both
3. Go to the **Applications** tab inside the connection and toggle on your app
4. Click **Save**

### 7. Activate the My Account API (required for Token Vault)

1. Go to **Applications → APIs → Auth0 Management API**
2. Click the **Machine to Machine Applications** tab
3. Find your app and toggle it **on**
4. Under scopes, enable **`openid profile email offline_access`**
5. Click **Update**

Then copy your **Management API URL** (`https://your-tenant.us.auth0.com/api/v2`) into `AUTH0_TOKEN_VAULT_URL` in `.env.local`.

> **Free tier note:** The free plan allows 2 social connections and 2 Token Vault connected apps — exactly enough for GitHub + Slack. No upgrade needed.

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
    ├── audit.ts        ← withAuditLog() helper — wraps actions with audit logging
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
`src/proxy.ts` (Next.js middleware) protects `/dashboard` and `/audit`. Any unauthenticated request redirects to Auth0 login. The Auth0 SDK handles the full PKCE flow via the `[auth0]` catch-all route at `/auth/callback`.

### 2. Agent trigger
`POST /api/agent/review` is the entry point. It:
1. Validates the session (`auth0.getSession()`)
2. Gets GitHub + Slack tokens from Token Vault
3. Calls `reviewPullRequest()` from `src/lib/agent.ts`
4. Logs every step to `AuditLog` via `withAuditLog()`

### 3. Agent loop
`src/lib/agent.ts` uses Vercel AI SDK `generateText` with three tools:
- `fetchPRDetails` — calls GitHub REST API for PR diff/metadata
- `fetchSlackContext` — calls Slack API for channel messages
- `postReviewComment` — posts review back to GitHub (write action, requires step-up)

### 4. Audit trail
Every `withAuditLog()` call writes a row to the SQLite `AuditLog` table. The `/audit` page polls `GET /api/audit` every 3 seconds while an agent run is active.

### 5. Step-up auth
Before `postReviewComment` executes, the API verifies the session has a recent MFA challenge (`acr` claim). If not, the client is redirected through an Auth0 step-up authorization request.

---

## Useful commands

This project uses [`mise`](https://mise.jdx.dev/) as the primary task runner. Run `mise install` first to get the correct Node version.

```bash
mise run setup              # First-time: npm install + generate Prisma client
mise run dev                # Start dev server (http://localhost:3000)
mise run build              # Production build
mise run lint               # ESLint

mise run prisma:studio      # Database GUI (http://localhost:5555)
mise run prisma:migrate     # Apply schema changes + regenerate client
mise run prisma:push        # Push schema without creating a migration (prototyping)
mise run prisma:generate    # Regenerate Prisma client after schema edit
```

> `package.json` scripts (`npm run dev` etc.) still work and are used by Vercel CI. Use `mise run` locally.

---

## Working without Token Vault

Stub the helpers in `src/lib/token-vault.ts` to use a personal access token directly:

```ts
export async function getGitHubToken(_userId: string, _auth0AccessToken: string): Promise<string> {
  return process.env.DEV_GITHUB_TOKEN!
}

export async function getSlackToken(_userId: string, _auth0AccessToken: string): Promise<string> {
  return process.env.DEV_SLACK_TOKEN!
}
```

Add `DEV_GITHUB_TOKEN` and `DEV_SLACK_TOKEN` to `.env.local`.

---

## Adding a new agent tool

1. Define the tool in `src/lib/agent.ts` using the Vercel AI SDK `tool()` helper:

```ts
import { tool } from 'ai'
import { z } from 'zod'

const myTool = tool({
  description: 'What this tool does',
  inputSchema: z.object({
    param: z.string().describe('What this param is'),
  }),
  execute: async ({ param }) => {
    return withAuditLog(
      { userId, action: 'my_tool_action', service: 'github', details: { param } },
      async () => {
        // ... do the work
        return result
      }
    )
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
  details   String           // JSON string with action-specific details
  error     String?
  timestamp DateTime @default(now())

  @@index([userId])
  @@index([timestamp])
  @@index([service])
}

model ConnectedService {
  id          String   @id @default(cuid())
  userId      String
  service     String           // "github" | "slack"
  scopes      String           // comma-separated scopes string
  connectedAt DateTime @default(now())

  @@unique([userId, service])
  @@index([userId])
}
```

---

## Branching

- `main` — always deployable, branch protected
- Feature branches: `feat/<short-description>`
- Bug fixes: `fix/<short-description>`
- Docs: `docs/<short-description>`

Open a PR against `main`. No force-pushes to `main`.
