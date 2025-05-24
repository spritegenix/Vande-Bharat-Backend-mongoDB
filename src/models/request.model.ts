// models/request.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';

export type RequestType = 'JOIN_COMMUNITY' | 'COMMUNITY_INVITE';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface IRequest extends Document {
  fromUserId: string;
  toUserId?: string;
  communityId: Types.ObjectId;
  type: RequestType;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const requestSchema = new Schema<IRequest>(
  {
    fromUserId: { type: String, ref: 'User', required: true },
    toUserId: { type: String, ref: 'User' },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    type: {
      type: String,
      enum: ['JOIN_COMMUNITY', 'COMMUNITY_INVITE'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

requestSchema.plugin(auditPlugin, { modelName: 'Request' });

export const RequestModel = model<IRequest>('Request', requestSchema);
