import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';
import { IMedia, mediaSchema } from './media.model';

export interface IPost extends Document {
  _id: Types.ObjectId;
  content: string;
  tags?: string[];
  userId: string;
  pageId?: Types.ObjectId | null;
  communityId?: Types.ObjectId | null;
  attachments?: IMedia[];
  likes: String[];
  comments: Types.ObjectId[];
  linkedNotifications: Types.ObjectId[];
  likeCount: number;
  commentCount: number;
  isDeleted: boolean;
  isHidden: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 1000,
    },
    tags: [{ type: String }],
    userId: { type: String, ref: 'User', required: true },
    pageId: { type: Schema.Types.ObjectId, ref: 'Page', default: null },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', default: null },
    attachments: {
      type: [mediaSchema],
      validate: {
        validator: function (arr: IMedia[]) {
          return arr.length <= 10;
        },
        message: 'Maximum of 10 attachments allowed.',
      },
    },
    likes: [{ type: String, ref: 'User' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    linkedNotifications: [{ type: Schema.Types.ObjectId, ref: 'Notification' }],
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals (optional: for frontend convenience)
// postSchema.virtual('likeCountVirtual').get(function () {
//   return this.likes?.length || 0;
// });

// postSchema.virtual('commentCountVirtual').get(function () {
//   return this.bookmarks?.length || 0;
// });

// Indexes for performance
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ pageId: 1 });
postSchema.index({ communityId: 1 });
postSchema.index({ createdAt: -1, likeCount: -1 }); // for sorting by popularity

// ✅ Attach audit + soft delete plugin
postSchema.plugin(auditPlugin, { modelName: 'Post' });

export const PostModel = model<IPost>('Post', postSchema);
