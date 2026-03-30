# 🤖 Auth0 Agent Review — Claude Code Instructions

## Project
Agentic Code Review Bot with Audit Trail. Uses Auth0 Token Vault to securely access GitHub and Slack on behalf of users. Built for the "Authorized to Act" Auth0 hackathon (deadline: April 6, 2026).

## Stack
- Next.js 16 (App Router) + TypeScript
- Auth0 Next.js SDK v4 (`@auth0/nextjs-auth0`) — uses `Auth0Client`, not the old `withApiAuthRequired`
- Auth0 AI SDK v6 (`@auth0/ai`) — Token Vault integration
- Vercel AI SDK v6 (`ai`) — agent loop with `generateText` + `tool`
- Prisma 6 + SQLite — audit log and connected services
- Tailwind CSS v4

## Critical: This is Next.js 16 with breaking changes
Read `node_modules/next/dist/docs/` before writing any Next.js code. APIs differ from training data.

## Auth0 SDK v4 patterns
- Server: `import { auth0 } from '@/lib/auth0'` → `auth0.getSession()`
- Route handler: `export const GET = auth0.handleAuth()`
- Middleware: `export default auth0.middleware`
- No `withPageAuthRequired` wrapper — use `auth0.getSession()` in server components directly

## Vercel AI SDK v6 patterns
- `generateText` with `tools`, `stopWhen: stepCountIs(N)`
- Tool definitions use `tool({ description, parameters: z.object({...}), execute })`

## Dev commands
```bash
npm run dev          # start dev server
npx prisma studio    # browse database
npx prisma migrate dev  # run migrations
```

## Env vars
Copy `.env.local.example` to `.env.local` and fill in all values before running.

## Architecture
- `/src/lib/agent.ts` — main agent logic
- `/src/lib/token-vault.ts` — Token Vault helpers (getGitHubToken, getSlackToken)
- `/src/lib/audit.ts` — audit log helpers
- `/src/app/api/agent/review/` — agent trigger endpoint
- `/src/app/dashboard/` — main UI
- `/src/app/audit/` — audit trail UI
