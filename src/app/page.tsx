import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import {
  GitPullRequest,
  ShieldCheck,
  ScrollText,
  Zap,
  Lock,
  MessageSquare,
} from "lucide-react";

const features = [
  {
    icon: <GitPullRequest className="h-5 w-5 text-indigo-600" />,
    title: "AI-Powered PR Reviews",
    description:
      "The agent fetches the full diff, analyses it with GPT-4o, and posts structured review comments directly on your GitHub pull request.",
  },
  {
    icon: <Lock className="h-5 w-5 text-indigo-600" />,
    title: "Auth0 Token Vault",
    description:
      "Your GitHub and Slack OAuth tokens are stored and managed securely by Auth0 Token Vault — the agent never sees raw credentials.",
  },
  {
    icon: <MessageSquare className="h-5 w-5 text-indigo-600" />,
    title: "Slack Context Enrichment",
    description:
      "Optionally provide a Slack channel ID and the agent will pull recent discussion threads to give the LLM richer context.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-indigo-600" />,
    title: "Step-Up Authentication",
    description:
      "Write actions (posting comments, approving PRs) require step-up MFA via Auth0, ensuring no accidental mutations.",
  },
  {
    icon: <ScrollText className="h-5 w-5 text-indigo-600" />,
    title: "Full Audit Trail",
    description:
      "Every action the agent takes — token fetches, API calls, review posts — is persisted to an immutable audit log.",
  },
  {
    icon: <Zap className="h-5 w-5 text-indigo-600" />,
    title: "Multi-Step Agent Loop",
    description:
      "Powered by the Vercel AI SDK with tool-calling, the agent autonomously decides which tools to invoke to complete the review.",
  },
];

export default async function HomePage() {
  const session = await auth0.getSession();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-20 text-center sm:pt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Powered by Auth0 Token Vault + AI SDK
          </div>

          <h1 className="mb-5 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
            Agentic Code Review
            <br />
            <span className="text-indigo-600">with a full audit trail</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Connect your GitHub and Slack accounts via Auth0 Token Vault, then
            let an AI agent review your pull requests — every action logged,
            every write action gated behind step-up authentication.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {session ? (
              <>
                <Button size="lg" asChild>
                  <Link href="/dashboard">Open Dashboard</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/audit">View Audit Trail</Link>
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" asChild>
                  <a href="/auth/login?returnTo=/dashboard">
                    Get started &mdash; it&apos;s free
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/auth/login">Sign in</a>
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Features grid */}
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                  {f.icon}
                </div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-50">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        Built for the Auth0 Hackathon &mdash; CodeReview Agent
      </footer>
    </div>
  );
}
