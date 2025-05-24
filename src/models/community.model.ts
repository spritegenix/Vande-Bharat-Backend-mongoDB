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

  owner: string; // Clerk userId (string)
  members: string[]; // Clerk userIds
  admins: string[]; // Clerk userIds

  posts: Types.ObjectId[];
  followingCount: number;

  isVerified: boolean;
  isPrivate: boolean;

  isDeleted?: boolean;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const communitySchema = new Schema<ICommunity>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, maxlength: 1000, default: null },
    tags: [{ type: String }],
    avatar: { type: String, default: null },
    banner: { type: String, default: null },

    // Clerk userId references (strings, not ObjectId)
    owner: { type: String, ref: 'User', required: true },
    members: [{ type: String, ref: 'User' }],
    admins: [{ type: String, ref: 'User' }],

    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    followingCount: { type: Number, default: 0 },

    isVerified: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Index for query performance on owner
communitySchema.index({ owner: 1 });

// Apply audit plugin (createdBy, updatedBy, etc.)
communitySchema.plugin(auditPlugin, { modelName: 'Community' });

export const Community = model<ICommunity>('Community', communitySchema);
