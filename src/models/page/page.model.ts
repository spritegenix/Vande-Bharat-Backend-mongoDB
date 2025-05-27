import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';
import { IMedia, mediaSchema } from '../media.model';
import { categorySchema, ICategory } from './category.model';
import { IPost } from '../post.model';
import { IProduct } from './product.model';

export interface IPage extends Document {
  _id: Types.ObjectId;
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
  followersCount: number;

  posts: IPost[];
  categories: Types.DocumentArray<ICategory>;
  media: IMedia[];
  products: IProduct[];

  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date | null;
}

const pageSchema = new Schema<IPage>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },

    description: { type: String },
    tags: [{ type: String }],
    avatar: { type: String },
    banner: { type: String },

    isVerified: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },

    owner: { type: String, ref: 'User', required: true },
    admins: [{ type: String, ref: 'User' }],
    followers: [{ type: String, ref: 'User' }],
    followersCount: { type: Number, default: 0 },

    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    categories: [categorySchema],
    media: [mediaSchema],
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for full-text indexing
pageSchema.virtual('tagsText').get(function (this: IPage) {
  return this.tags?.join(' ') ?? '';
});

// Corrected text index using virtual
pageSchema.index({ name: 'text', tagsText: 'text' });

pageSchema.plugin(auditPlugin, { modelName: 'Page' });

export const Page = model<IPage>('Page', pageSchema);



// db.pages.dropIndexes();