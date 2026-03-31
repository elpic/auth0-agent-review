import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getAuditLogs, type AuditService } from "@/lib/audit";

/**
 * GET /api/audit
 *
 * Query params:
 *   limit  - number of entries to return (default 50)
 *   offset - pagination offset (default 0)
 *   service - filter by service ("github" | "slack" | "agent" | "auth")
 *
 * Returns the audit log entries for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const service = searchParams.get("service") as AuditService | null;

  const entries = await getAuditLogs(session.user.email as string, {
    limit,
    offset,
    service: service ?? undefined,
  });

  return NextResponse.json({ entries });
}
