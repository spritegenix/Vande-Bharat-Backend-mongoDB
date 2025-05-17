export type AuditAction = 'CREATE' | 'UPDATE' | 'SOFT_DELETE';

export interface AuditLogInput {
  modelName: string;
  documentId: string;
  action: AuditAction;
  performedBy?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
}
