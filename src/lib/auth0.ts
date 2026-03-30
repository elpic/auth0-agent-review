import { Auth0Client } from "@auth0/nextjs-auth0/server";

/**
 * Singleton Auth0 server client.
 * Configuration is read from environment variables:
 *   AUTH0_SECRET, AUTH0_BASE_URL, AUTH0_DOMAIN,
 *   AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET
 */
export const auth0 = new Auth0Client({
  // Auth0 SDK v4 reads most config from env vars automatically.
  // Explicit overrides can be added here when needed.
});
