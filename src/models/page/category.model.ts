import { Schema, model, Document, Types } from 'mongoose';
import { IMedia, mediaSchema } from '../media.model';

export type CategoryType = 'PRODUCTS' | 'MEDIA';

export interface ICategoryProduct {
  productId: Types.ObjectId;
  order: number;
}

export interface ICategoryMedia extends IMedia {
  order?: number;
}

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  type: CategoryType;
  pageId: Types.ObjectId;

  media: ICategoryMedia[]; // if type === 'MEDIA'
  products: ICategoryProduct[]; // if type === 'PRODUCTS'

  order: number;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['PRODUCTS', 'MEDIA'], required: true },

    media: {
      type: [mediaSchema],
      validate: {
        validator: (arr: ICategoryMedia[]) => arr.length <= 10,
        message: 'Maximum of 10 media attachments allowed.',
      },
    },

    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        order: { type: Number, default: 0 },
      },
    ],

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
