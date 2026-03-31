import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

const VALID_SERVICES = ["github", "slack"] as const;
type Service = (typeof VALID_SERVICES)[number];

/**
 * GET /api/connections/callback?service=github
 *
 * Called after Auth0 completes the OAuth flow for a service connection.
 * Writes (or updates) the ConnectedService record, then redirects to /dashboard.
 */
export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get("service") as Service | null;

  if (!service || !VALID_SERVICES.includes(service)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const session = await auth0.getSession(req);
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login?returnTo=/dashboard", req.url));
  }

  const userId = session.user.sub;

  await prisma.connectedService.upsert({
    where: { userId_service: { userId, service } },
    create: { userId, service, scopes: "" },
    update: { scopes: "" },
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
