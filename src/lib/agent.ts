/**
 * AI Agent: Agentic Code Review Bot
 *
 * Uses the Vercel AI SDK (v6) with tool-calling to:
 * 1. Fetch PR details from GitHub
 * 2. Fetch related Slack threads for context
 * 3. Analyse the diff with an LLM
 * 4. Post a structured review comment back to GitHub
 *
 * Every tool call is wrapped with `withAuditLog` so every action is
 * persisted to the audit trail before and after execution.
 */

import { openai } from "@ai-sdk/openai";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { withAuditLog } from "@/lib/audit";
import { getGitHubToken, getSlackToken } from "@/lib/token-vault";

export interface ReviewPRParams {
  /** Auth0 user ID */
  userId: string;
  /** Auth0 access token (used to call Token Vault) */
  auth0AccessToken: string;
  /** GitHub repository in owner/repo format */
  repo: string;
  /** Pull request number */
  prNumber: number;
  /** Optional: Slack channel ID to pull context from */
  slackChannelId?: string;
}

export interface ReviewResult {
  summary: string;
  comments: Array<{ path: string; line: number; body: string }>;
  auditLogIds: string[];
}

export async function reviewPullRequest(
  params: ReviewPRParams
): Promise<ReviewResult> {
  const { userId, auth0AccessToken, repo, prNumber, slackChannelId } = params;

  const auditLogIds: string[] = [];

  // ── Fetch tokens from Token Vault ──────────────────────────────────────────
  const githubToken = await withAuditLog(
    {
      userId,
      action: "fetch_github_token",
      service: "auth",
      details: { repo, prNumber },
    },
    () => getGitHubToken(userId, auth0AccessToken)
  );

  let slackToken: string | null = null;
  if (slackChannelId) {
    slackToken = await withAuditLog(
      {
        userId,
        action: "fetch_slack_token",
        service: "auth",
        details: { slackChannelId },
      },
      () => getSlackToken(userId, auth0AccessToken)
    );
  }

  // ── Define agent tools ─────────────────────────────────────────────────────

  const fetchPRDetails = tool({
    description: "Fetch the pull request details and diff from GitHub",
    inputSchema: z.object({
      repo: z.string().describe("owner/repo format"),
      prNumber: z.number().describe("Pull request number"),
    }),
    execute: async ({ repo: toolRepo, prNumber: toolPrNumber }) => {
      return withAuditLog(
        {
          userId,
          action: "fetch_pr_details",
          service: "github",
          details: { repo: toolRepo, prNumber: toolPrNumber },
        },
        async () => {
          const [owner, repoName] = toolRepo.split("/");

          const [prRes, diffRes] = await Promise.all([
            fetch(
              `https://api.github.com/repos/${owner}/${repoName}/pulls/${toolPrNumber}`,
              {
                headers: {
                  Authorization: `Bearer ${githubToken}`,
                  Accept: "application/vnd.github.v3+json",
                },
              }
            ),
            fetch(
              `https://api.github.com/repos/${owner}/${repoName}/pulls/${toolPrNumber}`,
              {
                headers: {
                  Authorization: `Bearer ${githubToken}`,
                  Accept: "application/vnd.github.v3.diff",
                },
              }
            ),
          ]);

          if (!prRes.ok) {
            throw new Error(`GitHub PR fetch failed: ${prRes.status}`);
          }

          const pr = (await prRes.json()) as {
            title: string;
            body: string;
            user: { login: string };
            base: { ref: string };
            head: { ref: string };
            additions: number;
            deletions: number;
            changed_files: number;
          };
          const diff = diffRes.ok ? await diffRes.text() : "";

          return {
            title: pr.title,
            body: pr.body,
            author: pr.user.login,
            baseBranch: pr.base.ref,
            headBranch: pr.head.ref,
            additions: pr.additions,
            deletions: pr.deletions,
            changedFiles: pr.changed_files,
            diff: diff.slice(0, 12000), // Truncate large diffs
          };
        }
      );
    },
  });

  const fetchSlackContext = tool({
    description: "Fetch recent messages from a Slack channel for context",
    inputSchema: z.object({
      channelId: z.string().describe("Slack channel ID"),
      limit: z.number().default(20).describe("Number of messages to fetch"),
    }),
    execute: async ({ channelId, limit }) => {
      if (!slackToken) return { messages: [] };

      return withAuditLog(
        {
          userId,
          action: "fetch_slack_context",
          service: "slack",
          details: { channelId, limit },
        },
        async () => {
          const res = await fetch(
            `https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`,
            {
              headers: {
                Authorization: `Bearer ${slackToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!res.ok) {
            throw new Error(`Slack API failed: ${res.status}`);
          }

          const data = (await res.json()) as {
            ok: boolean;
            error?: string;
            messages?: Array<{ text: string; user: string; ts: string }>;
          };
          if (!data.ok) {
            throw new Error(`Slack error: ${data.error}`);
          }

          return {
            messages: (data.messages ?? []).map((m) => ({
              text: m.text,
              user: m.user,
              ts: m.ts,
            })),
          };
        }
      );
    },
  });

  const postReviewComment = tool({
    description:
      "Post a review comment on the GitHub pull request. Requires step-up auth.",
    inputSchema: z.object({
      repo: z.string(),
      prNumber: z.number(),
      body: z.string().describe("The review comment body (markdown supported)"),
      event: z
        .enum(["COMMENT", "APPROVE", "REQUEST_CHANGES"])
        .default("COMMENT"),
    }),
    execute: async ({ repo: toolRepo, prNumber: toolPrNumber, body, event }) => {
      const [owner, repoName] = toolRepo.split("/");

      return withAuditLog(
        {
          userId,
          action: "post_review_comment",
          service: "github",
          details: { repo: toolRepo, prNumber: toolPrNumber, event, bodyLength: body.length },
        },
        async () => {
          const res = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/pulls/${toolPrNumber}/reviews`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ body, event }),
            }
          );

          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(
              `GitHub post review failed: ${res.status} ${errBody}`
            );
          }

          const review = (await res.json()) as {
            id: number;
            html_url: string;
          };
          return { reviewId: review.id, htmlUrl: review.html_url };
        }
      );
    },
  });

  // ── Run the agent ──────────────────────────────────────────────────────────
  const systemPrompt = `You are an expert code reviewer. Your job is to:
1. Fetch the pull request details and diff using the fetchPRDetails tool.
2. If a Slack channel is provided, fetch context using fetchSlackContext.
3. Analyse the code changes thoroughly: check for bugs, security issues, performance problems, and style inconsistencies.
4. Post a single structured review comment using postReviewComment with a comprehensive markdown review.

Your review should include:
- An overall summary
- Specific findings with file and line references where possible
- Security considerations
- Suggestions for improvement

Be constructive and specific.`;

  const userPrompt = `Please review PR #${prNumber} in repository ${repo}${
    slackChannelId
      ? ` and fetch context from Slack channel ${slackChannelId}`
      : ""
  }.`;

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    prompt: userPrompt,
    tools: {
      fetchPRDetails,
      fetchSlackContext,
      postReviewComment,
    },
    stopWhen: stepCountIs(10),
  });

  return {
    summary: text,
    comments: [],
    auditLogIds,
  };
}
