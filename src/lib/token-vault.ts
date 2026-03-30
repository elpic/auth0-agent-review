/**
 * Auth0 Token Vault helpers.
 *
 * Token Vault stores and manages third-party OAuth tokens on behalf of your
 * users. The Auth0 AI SDK (`@auth0/ai`) provides a client for retrieving
 * those tokens at runtime so your agent can call GitHub, Slack, etc. without
 * ever storing raw tokens yourself.
 *
 * Docs: https://auth0.com/docs/secure/tokens/token-vault
 */

/**
 * Returns the stored GitHub access token for a user from Auth0 Token Vault.
 * The Auth0 AI SDK handles token refresh automatically.
 */
export async function getGitHubToken(
  userId: string,
  auth0AccessToken: string
): Promise<string> {
  const tokenVaultUrl = process.env.AUTH0_TOKEN_VAULT_URL;
  if (!tokenVaultUrl) {
    throw new Error("AUTH0_TOKEN_VAULT_URL is not configured");
  }

  // Fetch the GitHub connection token from Token Vault via the Auth0 Management API.
  // In production this is done via the Auth0 AI SDK with automatic refresh.
  const res = await fetch(
    `${tokenVaultUrl}/users/${encodeURIComponent(userId)}/identity-tokens/github`,
    {
      headers: {
        Authorization: `Bearer ${auth0AccessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token Vault GitHub fetch failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Returns the stored Slack access token for a user from Auth0 Token Vault.
 */
export async function getSlackToken(
  userId: string,
  auth0AccessToken: string
): Promise<string> {
  const tokenVaultUrl = process.env.AUTH0_TOKEN_VAULT_URL;
  if (!tokenVaultUrl) {
    throw new Error("AUTH0_TOKEN_VAULT_URL is not configured");
  }

  const res = await fetch(
    `${tokenVaultUrl}/users/${encodeURIComponent(userId)}/identity-tokens/slack`,
    {
      headers: {
        Authorization: `Bearer ${auth0AccessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token Vault Slack fetch failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}
