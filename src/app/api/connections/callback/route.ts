import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";
import { VALID_SERVICES, type Service } from "@/lib/connections";

/**
 * GET /api/connections/callback?service=github&userId=email
 *
 * Called after Auth0 completes the OAuth flow for a service connection.
 * Writes (or updates) the ConnectedService record, then redirects to /dashboard.
 */
export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get("service") as Service | null;

  if (!service || !VALID_SERVICES.includes(service)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Use the original userId (email) passed from the connect route — the OAuth
  // flow creates a new session with a different sub (e.g. github|xxx vs auth0|xxx).
  const originalUserId = req.nextUrl.searchParams.get("userId");

  const session = await auth0.getSession(req);
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login?returnTo=/dashboard", req.url));
  }

  // Prefer the original userId; fall back to current session email.
  const userId = originalUserId ?? (session.user.email as string);

  await prisma.connectedService.upsert({
    where: { userId_service: { userId, service } },
    create: { userId, service, scopes: "" },
    update: { scopes: "" },
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
