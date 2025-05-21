import { Schema, model, Types, Document } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';

export interface IComment extends Document {
  postId: Types.ObjectId;
  userId: string;
  content: string;
  parentCommentId?: Types.ObjectId | null;
  replies: Types.ObjectId[]; // list of reply IDs
  likes: Types.ObjectId[];
  likeCount: number;

  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: String, ref: 'User', required: true },

    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 1000,
    },

    parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },

    replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

commentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId', // from Comment (Clerk ID)
  foreignField: 'userId', // from User (Clerk ID)
  justOne: true,
});

commentSchema.set('toObject', { virtuals: true });
commentSchema.set('toJSON', { virtuals: true });

// Attach audit tracking
commentSchema.plugin(auditPlugin, { modelName: 'Comment' });

// Optional: prevent nesting deeper than 1 level
commentSchema.pre('save', async function (next) {
  if (this.parentCommentId) {
    const parent = await CommentModel.findById(this.parentCommentId);
    if (parent?.parentCommentId) {
      throw new Error('Nested replies are not allowed');
    }
  }
  next();
});

export const CommentModel = model<IComment>('Comment', commentSchema);
