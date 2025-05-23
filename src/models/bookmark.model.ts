import { Schema, model, Types, Document } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';

export interface IBookmark extends Document {
  userId: String; // Clerk ID
  postId: Types.ObjectId;
  createdAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}

const bookmarkSchema = new Schema<IBookmark>(
  {
    userId: { type: String, ref: 'User', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });

bookmarkSchema.plugin(auditPlugin, { modelName: 'Bookmark' });

export const BookmarkModel = model<IBookmark>('Bookmark', bookmarkSchema);
