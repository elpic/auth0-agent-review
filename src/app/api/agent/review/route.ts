import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { reviewPullRequest } from "@/lib/agent";
import { createAuditLog } from "@/lib/audit";

/**
 * POST /api/agent/review
 *
 * Body: { repo: string, prNumber: number, slackChannelId?: string }
 *
 * Triggers the AI agent to review a GitHub pull request.
 * Requires the user to be authenticated via Auth0.
 */
export async function POST(req: NextRequest) {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use email as stable identifier — sub changes per OAuth provider.
  const userId = session.user.email as string;

  let body: { repo?: string; prNumber?: number; slackChannelId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repo, prNumber, slackChannelId } = body;

  if (!repo || typeof repo !== "string") {
    return NextResponse.json(
      { error: "repo is required (format: owner/repo)" },
      { status: 400 }
    );
  }

  if (!prNumber || typeof prNumber !== "number") {
    return NextResponse.json(
      { error: "prNumber is required and must be a number" },
      { status: 400 }
    );
  }

  // Log the agent invocation
  await createAuditLog({
    userId,
    action: "agent_review_started",
    service: "agent",
    details: { repo, prNumber, slackChannelId },
    status: "pending",
  });

  try {
    // Retrieve the Auth0 access token for Token Vault calls
    const tokenResult = await auth0.getAccessToken();
    const auth0AccessToken = tokenResult.token;

    if (!auth0AccessToken) {
      return NextResponse.json(
        { error: "Could not retrieve access token" },
        { status: 500 }
      );
    }

    const result = await reviewPullRequest({
      userId,
      auth0AccessToken,
      repo,
      prNumber,
      slackChannelId,
    });

    await createAuditLog({
      userId,
      action: "agent_review_completed",
      service: "agent",
      details: { repo, prNumber, summaryLength: result.summary.length },
      status: "success",
    });

    return NextResponse.json(result);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";

    await createAuditLog({
      userId,
      action: "agent_review_failed",
      service: "agent",
      details: { repo, prNumber },
      status: "error",
      error: errorMessage,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
