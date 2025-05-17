import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';
import { IMedia, mediaSchema } from '../media.model';

export interface IProduct extends Document {
    title: string;
    description?: string;
    price: number;
    discountedPrice?: number;
    buyLink?: string[];
    attachments: IMedia[];
    categoryId: Types.ObjectId;
    order: number;
}

const productSchema = new Schema<IProduct>(
    {
        title: { type: String, required: true },
        description: String,
        price: { type: Number },
        discountedPrice: Number,
        buyLink: [{ type: String }],
        attachments: {
            type: [mediaSchema],
            validate: {
                validator: function (arr: IMedia[]) {
                    return arr.length <= 10;
                },
                message: 'Maximum of 10 attachments allowed.',
            },
        },
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

productSchema.plugin(auditPlugin);
export const Product = model<IProduct>('Product', productSchema);
