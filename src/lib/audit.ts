import { prisma } from "@/lib/prisma";

export type AuditService = "github" | "slack" | "agent" | "auth";
export type AuditStatus = "pending" | "success" | "error";

export interface CreateAuditLogParams {
  userId: string;
  action: string;
  service: AuditService;
  details: Record<string, unknown>;
  status: AuditStatus;
  error?: string;
}

/**
 * Writes a single audit log entry to the database.
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      service: params.service,
      details: JSON.stringify(params.details),
      status: params.status,
      error: params.error,
    },
  });
}

/**
 * Returns the most recent audit log entries for a given user.
 */
export async function getAuditLogs(
  userId: string,
  options: { limit?: number; offset?: number; service?: AuditService } = {}
) {
  const { limit = 50, offset = 0, service } = options;

  return prisma.auditLog.findMany({
    where: {
      userId,
      ...(service ? { service } : {}),
    },
    orderBy: { timestamp: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Wraps an async operation with automatic audit logging.
 * Logs a "pending" entry, then updates to "success" or "error".
 */
export async function withAuditLog<T>(
  params: Omit<CreateAuditLogParams, "status">,
  operation: () => Promise<T>
): Promise<T> {
  const log = await createAuditLog({ ...params, status: "pending" });

  try {
    const result = await operation();

    await prisma.auditLog.update({
      where: { id: log.id },
      data: { status: "success" },
    });

    return result;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";

    await prisma.auditLog.update({
      where: { id: log.id },
      data: { status: "error", error: errorMessage },
    });

    throw err;
  }
}
