"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GitPullRequest } from "lucide-react";

interface ReviewFormProps {
  slackConnected: boolean;
}

interface ReviewResult {
  summary: string;
  error?: string;
}

export function ReviewForm({ slackConnected }: ReviewFormProps) {
  const [repo, setRepo] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repo || !prNumber) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/agent/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo,
          prNumber: parseInt(prNumber, 10),
          slackChannelId: slackChannel || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ summary: "", error: data.error ?? "Review failed" });
      } else {
        setResult({ summary: data.summary });
      }
    } catch (err) {
      setResult({
        summary: "",
        error: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitPullRequest className="h-4 w-4" />
            Review a Pull Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="repo"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Repository
                </label>
                <input
                  id="repo"
                  type="text"
                  placeholder="owner/repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:placeholder-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="prNumber"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  PR Number
                </label>
                <input
                  id="prNumber"
                  type="number"
                  placeholder="42"
                  min={1}
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:placeholder-slate-500"
                />
              </div>
            </div>

            {slackConnected && (
              <div className="space-y-1.5">
                <label
                  htmlFor="slackChannel"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Slack Channel ID{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="slackChannel"
                  type="text"
                  placeholder="C0XXXXXXX"
                  value={slackChannel}
                  onChange={(e) => setSlackChannel(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:placeholder-slate-500"
                />
                <p className="text-xs text-slate-400">
                  The agent will fetch recent messages from this channel for
                  additional context.
                </p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Reviewing…" : "Start Review"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card
          className={
            result.error
              ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
              : ""
          }
        >
          <CardHeader>
            <CardTitle className="text-base">
              {result.error ? "Review Failed" : "Review Complete"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {result.error}
              </p>
            ) : (
              <div className="prose prose-slate prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm">{result.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
