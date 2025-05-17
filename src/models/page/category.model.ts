import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';
import { IMedia, mediaSchema } from '../media.model';

export type CategoryType = 'PRODUCTS' | 'MEDIA';

export interface ICategory extends Document {
  name: string;
  description?: string;
  type: CategoryType;
  pageId: Types.ObjectId;
  media: IMedia[]; // only if type === 'MEDIA'
  products: Types.ObjectId[]; // only if type === 'PRODUCTS'
  order: number;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['PRODUCTS', 'MEDIA'],
      required: true,
    },
    pageId: { type: Schema.Types.ObjectId, ref: 'Page', required: true },

    media: {
      type: [mediaSchema],
      validate: {
        validator: (arr: IMedia[]) => arr.length <= 10,
        message: 'Maximum of 10 attachments allowed.',
      },
    },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.plugin(auditPlugin);

// Enforce one type of content only
categorySchema.pre('save', function (next) {
  if (this.type === 'PRODUCTS') {
    this.media = []; // Clear media if type is products
  } else if (this.type === 'MEDIA') {
    this.products = []; // Clear products if type is media
  }
  next();
});

export const Category = model<ICategory>('Category', categorySchema);
