import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';
import { IMedia, mediaSchema } from '../media.model';

export interface IProduct extends Document {
    title: string;
    description?: string;
    tags?: string[];
    currency?: string;
    price: number;
    discountedPrice?: number;
    isInOffer?: boolean;
    buyLinks?: string[];
    attachments: IMedia[];
    pageId: Types.ObjectId;
    categoryId: Types.ObjectId;
    order: number;
    isPublished: boolean;
}

const productSchema = new Schema<IProduct>(
    {
        title: { type: String, required: true, index: true },
        description: String,
        tags: [{ type: String }],
        currency: { type: String, default: 'INR' },
        price: { type: Number },
        discountedPrice: Number,
        isInOffer: { type: Boolean, default: false },
        buyLinks: [{ type: String }],
        attachments: {
            type: [mediaSchema],
            validate: {
                validator: function (arr: IMedia[]) {
                    return arr.length <= 10;
                },
                message: 'Maximum of 10 attachments allowed.',
            },
        },
        pageId: { type: Schema.Types.ObjectId, ref: 'Page', required: true },
        order: { type: Number, default: 0 },
        isPublished: { type: Boolean, default: true },
    },
    { timestamps: true }
);
productSchema.index({ title: 'text', tags: 1, pageId: 1 }); // ✅ // for search

productSchema.plugin(auditPlugin, { modelName: 'Product' });
export const Product = model<IProduct>('Product', productSchema);
