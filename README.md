# Agentic Code Review Bot with Audit Trail

A Next.js application that uses an AI agent to review GitHub pull requests, enriched with Slack context, with every agent action persisted to a full audit trail. Built for the Auth0 Hackathon.

## Features

- **AI-powered PR reviews** — the agent fetches your PR diff and posts a structured review comment to GitHub using GPT-4o via the Vercel AI SDK
- **Auth0 Token Vault** — GitHub and Slack OAuth tokens are stored and retrieved securely; the agent never handles raw credentials
- **Slack context enrichment** — optionally provide a Slack channel ID; the agent pulls recent messages to give the LLM richer context
- **Step-up authentication** — write actions (posting reviews, approving PRs) require MFA step-up via Auth0
- **Immutable audit trail** — every tool call the agent makes is logged to SQLite with status, timestamp, and error details
- **shadcn/ui + Tailwind** — clean, responsive UI

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Auth | `@auth0/nextjs-auth0` v4 |
| Token Vault | `@auth0/ai` |
| AI Agent | Vercel AI SDK (`ai`) + `@ai-sdk/openai` |
| Database | Prisma v6 + SQLite |
| UI | Tailwind CSS + shadcn/ui |

## Project Structure

```
src/
├── app/
│   ├── (auth)/               # Auth0 redirect pages (future use)
│   ├── api/
│   │   ├── auth/[auth0]/     # Auth0 catch-all route handler
│   │   ├── agent/review/     # POST — trigger a PR review
│   │   └── audit/            # GET  — fetch audit log entries
│   ├── audit/                # Audit trail UI page
│   ├── dashboard/            # Main dashboard (connect services, run reviews)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # Landing page
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── audit-table.tsx       # Audit trail table component
│   ├── navbar.tsx            # Top navigation bar
│   ├── review-form.tsx       # PR review trigger form (client component)
│   └── service-connection-card.tsx
├── lib/
│   ├── agent.ts              # AI agent logic (Vercel AI SDK + tools)
│   ├── audit.ts              # Audit log helpers
│   ├── auth0.ts              # Auth0 singleton client
│   ├── prisma.ts             # Prisma singleton client
│   ├── token-vault.ts        # Auth0 Token Vault helpers
│   └── utils.ts              # cn(), formatDateTime(), truncate()
└── middleware.ts             # Auth0 middleware — protects /dashboard & /audit
prisma/
├── schema.prisma             # AuditLog + ConnectedService models
└── migrations/               # SQLite migration history
```

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd auth0-agent-review
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in all values (see comments in the file for guidance):

| Variable | Where to get it |
|---|---|
| `AUTH0_SECRET` | `openssl rand -hex 32` |
| `AUTH0_BASE_URL` | `http://localhost:3000` |
| `AUTH0_ISSUER_BASE_URL` | Your Auth0 tenant URL |
| `AUTH0_CLIENT_ID` | Auth0 dashboard — Applications |
| `AUTH0_CLIENT_SECRET` | Auth0 dashboard — Applications |
| `AUTH0_TOKEN_VAULT_URL` | Auth0 AI dashboard |
| `GITHUB_CLIENT_ID/SECRET` | GitHub — Developer Settings — OAuth Apps |
| `SLACK_CLIENT_ID/SECRET` | api.slack.com — Your Apps |
| `OPENAI_API_KEY` | platform.openai.com |
| `DATABASE_URL` | `file:./dev.db` (no change needed for local) |

### 3. Auth0 Application setup

In your Auth0 dashboard:

1. Create a **Regular Web Application**
2. Set **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
3. Set **Allowed Logout URLs**: `http://localhost:3000`
4. Enable **Refresh Token Rotation** under Advanced Settings — Grant Types
5. Add **GitHub** as a Social Connection (use your `GITHUB_CLIENT_ID/SECRET`)
6. Add **Slack** as a Social Connection (use your `SLACK_CLIENT_ID/SECRET`)
7. Configure **Token Vault** in the Auth0 AI dashboard and note the URL

### 4. Run the database migration

```bash
npx prisma migrate dev
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

### Agent flow

```
User submits PR review form
        |
        v
POST /api/agent/review
        |
        +-- Log "agent_review_started" to AuditLog
        |
        +-- Fetch GitHub token from Auth0 Token Vault
        |   +-- Log "fetch_github_token" (success/error)
        |
        +-- Fetch Slack token from Auth0 Token Vault (if channel provided)
        |   +-- Log "fetch_slack_token" (success/error)
        |
        +-- AI Agent loop (Vercel AI SDK generateText with maxSteps=10)
        |   +-- Tool: fetchPRDetails  -> GitHub API
        |   |   +-- Log "fetch_pr_details"
        |   +-- Tool: fetchSlackContext -> Slack API
        |   |   +-- Log "fetch_slack_context"
        |   +-- Tool: postReviewComment -> GitHub API (write - requires step-up)
        |       +-- Log "post_review_comment"
        |
        +-- Log "agent_review_completed" / "agent_review_failed"
```

### Step-up authentication

Before the agent posts a review comment (a write action), the API checks that the user's session has a recent MFA challenge. This is enforced via Auth0's `acr_values` / `max_age` parameters on the authorization request. The UI prompts the user to re-authenticate with MFA before submitting write-capable reviews.

### Audit trail

The `/audit` page and `GET /api/audit` endpoint expose the full history of agent actions for the authenticated user. Each entry records:

- `userId` — who triggered the action
- `action` — what the agent did (e.g. `fetch_pr_details`, `post_review_comment`)
- `service` — which service was involved (`github`, `slack`, `agent`, `auth`)
- `status` — `pending` | `success` | `error`
- `details` — JSON blob with action-specific metadata
- `error` — error message if status is `error`
- `timestamp` — when the action occurred

## Scripts

```bash
npm run dev             # Start dev server
npm run build           # Production build
npm run start           # Start production server
npm run lint            # ESLint
npx prisma studio       # Open Prisma Studio (database GUI)
npx prisma migrate dev  # Apply schema changes
```

## License

MIT
