import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';
import { IMedia, mediaSchema } from './media.model';

export interface IPost extends Document {
  content: string;
  tags?: string[];
  userId: Types.ObjectId;
  pageId?: Types.ObjectId | null;
  communityId?: Types.ObjectId | null;
  attachments?: IMedia[];
  likes: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  comments: Types.ObjectId[];
  linkedNotifications: Types.ObjectId[];
  likeCount: number;
  bookmarkCount: number;
  isDeleted: boolean;
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
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    linkedNotifications: [{ type: Schema.Types.ObjectId, ref: 'Notification' }],
    likeCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
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

// postSchema.virtual('bookmarkCountVirtual').get(function () {
//   return this.bookmarks?.length || 0;
// });

// Indexes for performance
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ pageId: 1 });
postSchema.index({ communityId: 1 });
postSchema.index({ createdAt: -1, likeCount: -1 }); // for sorting by popularity

postSchema.plugin(auditPlugin, { modelName: 'Post' });

export const PostModel = model<IPost>('Post', postSchema);
