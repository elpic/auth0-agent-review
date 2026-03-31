import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { ServiceConnectionCard } from "@/components/service-connection-card";
import { ReviewForm } from "@/components/review-form";
import { Separator } from "@/components/ui/separator";
import { GitBranch, Hash } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login?returnTo=/dashboard");
  }

  // Use email as the stable user identifier — session.user.sub changes with
  // each OAuth provider (github|xxx, oauth2|slack|xxx, etc.) but email is
  // consistent across all linked accounts.
  const userId = session.user.email as string;

  // Fetch connected services for this user
  const services = await prisma.connectedService.findMany({
    where: { userId },
  });

  const githubService = services.find((s) => s.service === "github");
  const slackService = services.find((s) => s.service === "slack");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your connected services and trigger PR reviews.
          </p>
        </div>

        {/* Connected Services */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Connected Services
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ServiceConnectionCard
              name="GitHub"
              description="Required for reading PRs and posting review comments."
              icon={<GitBranch className="h-5 w-5" />}
              connected={!!githubService}
              scopes={githubService?.scopes}
              connectedAt={
                githubService
                  ? formatDateTime(githubService.connectedAt)
                  : undefined
              }
              connectHref="/api/connections/connect?service=github"
            />
            <ServiceConnectionCard
              name="Slack"
              description="Optional. Used to fetch channel context for richer reviews."
              icon={<Hash className="h-5 w-5" />}
              connected={!!slackService}
              scopes={slackService?.scopes}
              connectedAt={
                slackService
                  ? formatDateTime(slackService.connectedAt)
                  : undefined
              }
              connectHref="/api/connections/connect?service=slack"
            />
          </div>

          {!githubService && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              Connect GitHub above before running a review. Your token is stored
              securely in Auth0 Token Vault.
            </p>
          )}
        </section>

        <Separator className="mb-10" />

        {/* Review Form */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Run a Review
          </h2>

          {githubService ? (
            <ReviewForm slackConnected={!!slackService} />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Connect GitHub first to enable PR reviews.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
