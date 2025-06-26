import { Types } from 'mongoose';

interface CursorData {
  _id: Types.ObjectId;
  createdAt: Date;
  score?: number; // for popular sorting
  order?: number; // optional if you’re using custom ordering
  source?: 'followed' | 'remaining'; // this is new
}

/**
 * Encodes cursor data into a base64 string
 */
export const encodeCursor = (data: CursorData): string => {
  const plainData = {
    _id: data._id.toString(),
    createdAt: data.createdAt.toISOString(),
    ...(data.score !== undefined && { score: data.score }),
    ...(data.order !== undefined && { order: data.order }),
    ...(data.source && { source: data.source }),
  };

  return Buffer.from(JSON.stringify(plainData)).toString('base64');
};

/**
 * Decodes base64 cursor back into usable CursorData
 */
export const decodeCursor = (cursor: string): CursorData | null => {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    return {
      _id: new Types.ObjectId(parsed._id),
      createdAt: new Date(parsed.createdAt),
      score: parsed.score,
      order: parsed.order,
      source: parsed.source,
    };
  } catch (err) {
    console.error('Invalid cursor format:', err);
    return null;
  }
};
