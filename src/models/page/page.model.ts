import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';

export interface IPage extends Document {
  name: string;
  slug: string;

  description?: string;
  tags?: string[];
  avatar?: string;
  banner?: string;

  isVerified: boolean;
  isHidden: boolean;

  owner: Types.ObjectId;
  moderators: Types.ObjectId[];
  followers: Types.ObjectId[];

  posts: Types.ObjectId[];
  categories: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const pageSchema = new Schema<IPage>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },

    description: { type: String },
    tags: [{ type: String }],
    avatar: { type: String },
    banner: { type: String },

    isVerified: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },

    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

pageSchema.plugin(auditPlugin, { modelName: 'Page' });

export const Page = model<IPage>('Page', pageSchema);
