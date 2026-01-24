import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { log } from '@/lib/observability/logger';

export type AuditActorType = 'admin' | 'host' | 'system';

export type AuditActor = {
  type: AuditActorType;
  id?: string;
  email?: string;
  ipAddress?: string;
};

export type AuditTarget = {
  type: string;
  id: string;
};

export async function listAuditLogsForTarget(params: {
  targetType: string;
  targetId: string;
  limit?: number;
  database?: Pick<typeof db, 'select'>;
}) {
  const database = params.database ?? db;
  const limit = params.limit ?? 25;

  return database
    .select({
      id: auditLogs.id,
      actorType: auditLogs.actorType,
      actorId: auditLogs.actorId,
      actorEmail: auditLogs.actorEmail,
      action: auditLogs.action,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(eq(auditLogs.targetType, params.targetType), eq(auditLogs.targetId, params.targetId))
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

type AuditDatabase = Pick<typeof db, 'insert'>;

export async function recordAuditEvent(params: {
  actor: AuditActor;
  action: string;
  target: AuditTarget;
  metadata?: Record<string, unknown>;
  database?: AuditDatabase;
}) {
  const { actor, action, target, metadata } = params;
  const database = params.database ?? db;

  try {
    await database.insert(auditLogs).values({
      actorType: actor.type,
      actorId: actor.id,
      actorEmail: actor.email,
      ipAddress: actor.ipAddress,
      action,
      targetType: target.type,
      targetId: target.id,
      metadata,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown_error';
    log('error', 'audit_log_failed', {
      action,
      targetType: target.type,
      targetId: target.id,
      errorMessage,
    });
    throw error;
  }
}
