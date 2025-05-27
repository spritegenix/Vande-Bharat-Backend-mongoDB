import { Schema, model, Document, Types } from 'mongoose';
import { IMedia, mediaSchema } from '../media.model';

export type CategoryType = 'PRODUCTS' | 'MEDIA';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  type: CategoryType;
  pageId: Types.ObjectId;
  media: IMedia[]; // only if type === 'MEDIA'
  products: Types.ObjectId[]; // only if type === 'PRODUCTS'
  order: number;
  isPublished: boolean;

  createdAt?: Date;  // Optional for safety
  updatedAt?: Date;
}

export const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['PRODUCTS', 'MEDIA'], required: true, },
    media: {
      type: [mediaSchema],
      validate: {
        validator: (arr: IMedia[]) => arr.length <= 10,
        message: 'Maximum of 10 attachments allowed.',
      },
    },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

    order: { type: Number, default: 0 },

    isPublished: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

// Clear opposite type content when type changes
categorySchema.pre('save', function (next) {
  if (this.isModified('type')) {
    if (this.type === 'MEDIA') {
      this.products = [];
    } else if (this.type === 'PRODUCTS') {
      this.media = [];
    }
  }
  next();
});
