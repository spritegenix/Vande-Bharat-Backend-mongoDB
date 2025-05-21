import { Schema, Types } from 'mongoose';

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
        validator: (v: string) =>
          /^https:\/\/[^\s]+$/.test(v), // Matches valid https URLs without enforcing extensions
        message: 'Invalid media URL format.',
      },
    },
    type: {
      type: String,
      required: true,
      enum: ['IMAGE', 'VIDEO'],
    },
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
          if (this.type === 'IMAGE') {
            return size <= 5 * 1024 * 1024; // 5 MB
          } else if (this.type === 'VIDEO') {
            return size <= 100 * 1024 * 1024; // 100 MB
          }
          return false;
        },
        message: function (props: any) {
          return `File size exceeds allowed limit for ${props?.value?.type || 'media'}.`;
        },
      },
    },
    width: {
      type: Number,
      required: function () {
        return this.type === 'IMAGE';
      },
    },
    height: {
      type: Number,
      required: function () {
        return this.type === 'IMAGE';
      },
    },
    duration: {
      type: Number,
      required: function () {
        return this.type === 'VIDEO';
      },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // embedded schema
);