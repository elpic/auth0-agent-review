import { prisma } from "@/lib/prisma";

interface Auth0Identity {
  provider: string;
  [key: string]: unknown;
}

/**
 * Syncs Auth0 linked identities to the ConnectedService table.
 *
 * For each known provider found in `user.identities`, this function upserts
 * a ConnectedService record. On create, `connectedAt` is set to now (via the
 * Prisma default). On update, `connectedAt` is preserved — only `scopes` is
 * written (as an empty string, since scope info is not available here).
 */
export async function syncConnections(user: {
  sub: string;
  [key: string]: unknown;
}): Promise<void> {
  // The Auth0 SDK v4 types do not expose `identities` — assert it here.
  const identities = (user as { identities?: Auth0Identity[] }).identities;

  if (!Array.isArray(identities) || identities.length === 0) {
    return;
  }

  const providerMap: Record<string, string> = {
    github: "github",
    "sign-in-with-slack": "slack",
  };

  const userId = user.sub;

  for (const identity of identities) {
    const service = providerMap[identity.provider];
    if (!service) {
      continue;
    }

    await prisma.connectedService.upsert({
      where: { userId_service: { userId, service } },
      create: {
        userId,
        service,
        scopes: "",
      },
      update: {
        // Preserve connectedAt — only update scopes if we ever have them.
        scopes: "",
      },
    });
  }
}
