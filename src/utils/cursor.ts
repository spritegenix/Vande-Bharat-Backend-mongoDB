import { Types } from 'mongoose';
interface CursorData {
  _id: Types.ObjectId;
  createdAt: Date;
  score?: number; // optional, only used when sorting by "popular"
  order?: number;
}

/**
 * Encodes _id, createdAt, and optional score into a base64 string
 */
export const encodeCursor = (data: CursorData): string => {
  const plainData = {
    _id: data._id.toString(),
    createdAt: data.createdAt.toISOString(),
    ...(data.score !== undefined && { score: data.score }),
    ...(data.order !== undefined && { order: data.order }),
  };

  return Buffer.from(JSON.stringify(plainData)).toString('base64');
};

/**
 * Decodes a base64 cursor into an object with _id, createdAt, and optional score
 */
export const decodeCursor = (cursor: string): CursorData | null => {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString();
    const parsed = JSON.parse(decoded);

    return {
      _id: new Types.ObjectId(parsed._id as string),
      createdAt: new Date(parsed.createdAt),
      score: parsed.score,
      order: parsed.order,
    };
  } catch (err) {
    console.error('Invalid cursor format:', err);
    return null;
  }
};