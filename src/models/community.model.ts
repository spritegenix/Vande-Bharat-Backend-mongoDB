import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';
import { generateSlug } from '@/utils/generateSlug';

export interface ICommunity extends Document {
  name: string;
  slug: string;
  description?: string;
  tags?: string[];
  avatar?: string;
  banner?: string;

  owner: Types.ObjectId; // User who created the community
  members: Types.ObjectId[]; // Joined users
  admins: Types.ObjectId[]; // Moderators or extra admins

  posts: Types.ObjectId[];

  isVerified: boolean;
  isPrivate: boolean;

  isDeleted?: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const communitySchema = new Schema<ICommunity>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, maxlength: 1000 },
    tags: [{ type: String }],
    avatar: { type: String },
    banner: { type: String },

    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],

    isVerified: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

communitySchema.pre('validate', async function (next) {
  if (!this.slug && this.name) {
    this.slug = await generateSlug(this.name);
  }
  next();
});

communitySchema.plugin(auditPlugin, { modelName: 'Community' });

export const Community = model<ICommunity>('Community', communitySchema);
