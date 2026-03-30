"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, truncate } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  service: string;
  status: string;
  details: string;
  error?: string | null;
  timestamp: Date | string;
}

interface AuditTableProps {
  entries: AuditEntry[];
}

const serviceColors: Record<string, "default" | "secondary" | "outline"> = {
  github: "default",
  slack: "secondary",
  agent: "outline",
  auth: "outline",
};

const statusVariants: Record<
  string,
  "success" | "warning" | "destructive" | "secondary"
> = {
  success: "success",
  pending: "warning",
  error: "destructive",
};

export function AuditTable({ entries }: AuditTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          No audit log entries yet
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Actions taken by the agent will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
              Timestamp
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
              Service
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
              Action
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
              Details
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
            >
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                {formatDateTime(entry.timestamp)}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={serviceColors[entry.service] ?? "outline"}
                  className="capitalize"
                >
                  {entry.service}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{entry.action}</td>
              <td className="px-4 py-3">
                <Badge
                  variant={statusVariants[entry.status] ?? "secondary"}
                  className="capitalize"
                >
                  {entry.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                {entry.error ? (
                  <span className="text-red-500">{truncate(entry.error, 80)}</span>
                ) : (
                  truncate(entry.details, 80)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
