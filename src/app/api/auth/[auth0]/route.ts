/**
 * Auth0 catch-all route handler.
 *
 * In @auth0/nextjs-auth0 v4 the SDK routes (/auth/login, /auth/logout,
 * /auth/callback) are handled automatically by the `auth0.middleware` in
 * src/middleware.ts. This file is kept as a no-op placeholder so that
 * Next.js does not 404 for direct navigations before the middleware runs.
 *
 * If you need to customise auth route behaviour, override `routes` in the
 * Auth0Client constructor (src/lib/auth0.ts) and handle them here.
 */

export async function GET() {
  return new Response("Auth routes are handled by middleware.", {
    status: 200,
  });
}

export async function POST() {
  return new Response("Auth routes are handled by middleware.", {
    status: 200,
  });
}
