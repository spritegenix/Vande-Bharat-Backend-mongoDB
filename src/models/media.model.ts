import { Schema, model, Document, Types } from 'mongoose';
import { auditPlugin } from '@/plugins/audit.plugin';

export interface IMedia {
  _id?: Types.ObjectId;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  uploadedAt?: Date;
}

export const mediaSchema = new Schema<IMedia>(
  {
    url: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^https:\/\/[^\s]+$/.test(v),
        message: 'Invalid media URL format.',
      },
    },
    type: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
    fileName: { type: String, required: true },
    mimeType: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^(image|video)\/[a-zA-Z0-9.+-]+$/.test(v),
        message: 'Invalid MIME type.',
      },
    },
    size: {
      type: Number,
      required: true,
      validate: {
        validator: function (this: IMedia, size: number) {
          if (this.type === 'IMAGE') return size <= 5 * 1024 * 1024;
          if (this.type === 'VIDEO') return size <= 100 * 1024 * 1024;
          return false;
        },
        message: () => `File size exceeds allowed limit.`,
      },
    },
    width: { type: Number, required: function () { return this.type === 'IMAGE'; } },
    height: { type: Number, required: function () { return this.type === 'IMAGE'; } },
    duration: { type: Number, required: function () { return this.type === 'VIDEO'; } },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    _id: true,
    timestamps: true,
  }
);
