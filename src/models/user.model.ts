import mongoose, { Schema, model, Document } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';
import { UserRole } from '@/constants';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  clerkId: string;
  slug: string;
  email: string;
  name: string;
  bio?: string;
  interest?: string[];
  avatar?: string;
  banner?: string;
  role: UserRole;

  mobileNumber?: string;
  countryCode?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;

  socialLinks?: string[];

  posts: mongoose.Types.ObjectId[];
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];

  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];

  pages: mongoose.Types.ObjectId[];
  communities: mongoose.Types.ObjectId[];

  likeCount: number;
  followerCount: number;
  followingCount: number;
  commentCount: number;

  isVerified: boolean;
  isHidden: boolean;
  isBlocked: boolean;
  isDeleted?: boolean;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },

    bio: { type: String, default: '' },
    interest: [{ type: String, default: '' }],
    avatar: { type: String, default: '' },
    banner: { type: String, default: '' },

    mobileNumber: { type: String, default: '' },
    countryCode: { type: String, default: '+91' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'Bharat' },
    pincode: { type: String, default: '' },

    socialLinks: [{ type: String, default: '' }],

    posts: { type: [{ type: Schema.Types.ObjectId, ref: 'Post' }], default: [] },
    likes: { type: [{ type: Schema.Types.ObjectId, ref: 'Post' }], default: [] },
    comments: { type: [{ type: Schema.Types.ObjectId, ref: 'Comment' }], default: [] },

    followers: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    following: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },

    pages: { type: [{ type: Schema.Types.ObjectId, ref: 'Page' }], default: [] },
    communities: { type: [{ type: Schema.Types.ObjectId, ref: 'Community' }], default: [] },

    likeCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },

    isVerified: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);


// Before validation or save
// userSchema.pre('validate', async function (next) {
//   if (!this.slug && this.name) {
//     this.slug = await generateSlug(this.name);
//   }
//   next();
// });

// ✅ Attach audit + soft delete plugin
userSchema.plugin(auditPlugin, { modelName: 'User' });

export const UserModel = model<IUser>('User', userSchema);
