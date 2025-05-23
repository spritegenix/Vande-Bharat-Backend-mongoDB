import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';

export interface ILike extends Document {
  userId: string; // Clerk ID
  postId: Types.ObjectId;
  createdAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}

const likeSchema = new Schema<ILike>(
  {
    userId: { type: String, required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

likeSchema.index({ userId: 1, postId: 1 }, { unique: true });
likeSchema.plugin(auditPlugin, { modelName: 'Like' });

export const LikeModel = model<ILike>('Like', likeSchema);
