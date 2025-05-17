import { Schema, model, Types, Document } from 'mongoose';

export type AuditAction = 'CREATE' | 'UPDATE' | 'SOFT_DELETE';

export interface IAuditLog extends Document {
  modelName: string;
  documentId: string;
  action: AuditAction;
  performedBy?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    modelName: { type: String, required: true },
    documentId: { type: String, required: true },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'SOFT_DELETE'],
      required: true,
    },
    performedBy: { type: String, default: null },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);
