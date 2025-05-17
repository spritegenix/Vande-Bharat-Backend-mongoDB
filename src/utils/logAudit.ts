import { AuditLogModel } from '@/models/audit-log.model';
import { AuditLogInput } from '@/types/audit-log.types';

export async function logAudit(data: AuditLogInput) {
  try {
    await AuditLogModel.create({
      ...data,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
