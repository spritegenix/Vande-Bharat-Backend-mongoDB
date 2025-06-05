import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';
import { IMedia, mediaSchema } from '../media.model';

export interface IProduct extends Document {
    _id: Types.ObjectId;
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
    isPublished: boolean;
    isDeleted: boolean;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
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
        isPublished: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);
productSchema.virtual('tagsText').get(function (this: IProduct) {
    return this.tags?.join(' ') ?? '';
});
productSchema.index({ title: 'text', tagsText: 'text' });

productSchema.index({ pageId: 1 });


productSchema.plugin(auditPlugin, { modelName: 'Product' });
export const Product = model<IProduct>('Product', productSchema);
