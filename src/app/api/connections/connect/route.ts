import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

const VALID_SERVICES = ["github", "slack"] as const;
type Service = (typeof VALID_SERVICES)[number];

const CONNECTION_MAP: Record<Service, string> = {
  github: "github",
  slack: "sign-in-with-slack",
};

/**
 * GET /api/connections/connect?service=github
 *
 * Initiates the Auth0 OAuth flow for a specific service connection.
 * After Auth0 completes the OAuth, it redirects to /api/connections/callback?service=github
 * which writes the ConnectedService record to the database.
 */
export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get("service") as Service | null;

  if (!service || !VALID_SERVICES.includes(service)) {
    return NextResponse.json({ error: "Invalid service" }, { status: 400 });
  }

  const session = await auth0.getSession(req);
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const callbackUrl = new URL("/api/connections/callback", req.url);
  callbackUrl.searchParams.set("service", service);
  // Pass email as the stable identifier — sub changes per OAuth provider.
  callbackUrl.searchParams.set("userId", session.user.email as string);

  const loginUrl = new URL("/auth/login", req.url);
  loginUrl.searchParams.set("connection", CONNECTION_MAP[service]);
  loginUrl.searchParams.set("returnTo", callbackUrl.pathname + callbackUrl.search);

  return NextResponse.redirect(loginUrl);
}
