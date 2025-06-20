import { auditPlugin } from "@/plugins/audit.plugin";
import mongoose, {Schema, Document} from "mongoose"


export type FollowRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | "CANCELLED";
export interface IFollowRequest extends Document{
    fromUserId: mongoose.Types.ObjectId;
    toUserId: mongoose.Types.ObjectId;
    status:FollowRequestStatus;
     isDeleted?: boolean;
  deletedAt?: Date | null;
    createdAt:Date;
    updatedAt:Date ;
}

const followRequestSchema = new Schema<IFollowRequest>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
  },
  { timestamps: true }
);

followRequestSchema.plugin(auditPlugin, { modelName: 'FollowRequest' });

export const FollowRequestModel = mongoose.model<IFollowRequest>('FollowRequest', followRequestSchema);