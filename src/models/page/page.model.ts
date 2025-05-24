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

  owner: string;
  admins: string[];
  followers: string[];

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

    owner: { type: String, ref: 'User', required: true },
    admins: [{ type: String, ref: 'User' }],
    followers: [{ type: String, ref: 'User' }],

    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

pageSchema.plugin(auditPlugin, { modelName: 'Page' });

export const Page = model<IPage>('Page', pageSchema);
