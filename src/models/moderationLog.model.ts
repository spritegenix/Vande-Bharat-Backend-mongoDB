import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';

export type ModerationAction =
  | 'POST_REMOVED'
  | 'USER_BANNED'
  | 'USER_MUTED'
  | 'COMMENT_DELETED'
  | 'ROLE_CHANGED'
  | 'JOIN_REQUEST_DENIED'
  | 'COMMUNITY_EDITED';

export interface IModerationLog extends Document {
  communityId: Types.ObjectId;
  action: ModerationAction;
  targetUserId?: Types.ObjectId;
  targetPostId?: Types.ObjectId;
  targetCommentId?: Types.ObjectId;
  performedBy: Types.ObjectId;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const moderationLogSchema = new Schema<IModerationLog>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    action: { type: String, required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
    targetCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

moderationLogSchema.plugin(auditPlugin, { modelName: 'ModerationLog' });

export const ModerationLog = model<IModerationLog>('ModerationLog', moderationLogSchema);
