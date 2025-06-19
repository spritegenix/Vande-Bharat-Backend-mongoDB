import { auditPlugin } from "@/plugins/audit.plugin";
import mongoose, {Schema, Document} from "mongoose"


export type FollowRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export interface IFollowRequest extends Document{
    fromUserId: mongoose.Types.ObjectId;
    toUserId: mongoose.Types.ObjectId;
    status:FollowRequestStatus;
    createdAt:Date;
    updatedAt:Date ;
}

const followRequestSchema = new Schema<IFollowRequest>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
  },
  { timestamps: true }
);

followRequestSchema.plugin(auditPlugin, { modelName: 'FollowRequest' });

export const FollowRequestModel = mongoose.model<IFollowRequest>('FollowRequest', followRequestSchema);