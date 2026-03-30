import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { getAuditLogs } from "@/lib/audit";
import { Navbar } from "@/components/navbar";
import { AuditTable } from "@/components/audit-table";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";

export default async function AuditPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login?returnTo=/audit");
  }

  const userId = session.user.sub;
  const entries = await getAuditLogs(userId, { limit: 100 });

  // Compute summary counts
  const total = entries.length;
  const byStatus = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});
  const byService = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.service] = (acc[e.service] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              <ScrollText className="h-5 w-5 text-indigo-600" />
              Audit Trail
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Every action taken by the agent is logged here in real time.
            </p>
          </div>

          {/* Summary badges */}
          {total > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{total} total</Badge>
              {byStatus.success && (
                <Badge variant="success">{byStatus.success} success</Badge>
              )}
              {byStatus.pending && (
                <Badge variant="warning">{byStatus.pending} pending</Badge>
              )}
              {byStatus.error && (
                <Badge variant="destructive">{byStatus.error} error</Badge>
              )}
              {Object.entries(byService).map(([svc, count]) => (
                <Badge key={svc} variant="outline">
                  {svc}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <AuditTable entries={entries} />

        {/* Pagination note */}
        {total === 100 && (
          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            Showing the 100 most recent entries. Use the{" "}
            <code className="font-mono">/api/audit</code> endpoint with{" "}
            <code className="font-mono">offset</code> for pagination.
          </p>
        )}
      </main>
    </div>
  );
}
