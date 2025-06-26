import { Types } from 'mongoose';

export const buildPostPipeline = ({
  match,
  sort = 'newest',
  limit = 10,
  excludeIds = [],
  cursor,
}: {
  match: Record<string, any>;
  sort?: 'popular' | 'newest';
  limit?: number;
  excludeIds?: Types.ObjectId[];
  cursor?: {
    _id: Types.ObjectId;
    createdAt: Date;
    score?: number;
  } | null;
}) => {
  const baseMatch = excludeIds.length
    ? { ...match, _id: { $nin: excludeIds } }
    : match;
  const pipeline: any[] = [{ $match: baseMatch }];
  // Add score for "popular"
  if (sort === 'popular') {
    pipeline.push({
      $addFields: {
        score: {
          $subtract: [
            {
              $add: [
                { $multiply: ['$likeCount', 2] },
                { $multiply: [{ $size: '$comments' }, 1.5] },
              ],
            },
            {
              $divide: [
                { $subtract: [new Date(), '$createdAt'] },
                1000 * 60 * 60 * 24, // decay per day
              ],
            },
          ],
        },
      },
    });

    // Cursor for score-based pagination
    if (cursor) {
      pipeline.push({
        $match: {
          $or: [
            { score: { $lt: cursor.score } },
            {
              score: cursor.score,
              _id: { $lt: cursor._id },
            },
          ],
        },
      });
    }

    pipeline.push({ $sort: { score: -1, _id: -1 } });
  }

  // For newest sort
  if (sort === 'newest') {
    if (cursor) {
      pipeline.push({
        $match: {
          $or: [
            { createdAt: { $lt: cursor.createdAt } },
            {
              createdAt: cursor.createdAt,
              _id: { $lt: cursor._id },
            },
          ],
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
  }

  // Pagination
  pipeline.push({ $limit: limit });

  // Populate user
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'userId',
    },
  });
  pipeline.push({
    $unwind: {
      path: '$userId',
      preserveNullAndEmptyArrays: false, // exclude if user not found
    },
  });

  // Exclude deleted users
  pipeline.push({
    $match: {
      'userId.isDeleted': false,
    },
  });

  // Populate page
  pipeline.push({
    $lookup: {
      from: 'pages',
      localField: 'pageId',
      foreignField: '_id',
      as: 'pageId',
    },
  });
  pipeline.push({
    $unwind: { path: '$pageId', preserveNullAndEmptyArrays: true },
  });

  // Populate community
  pipeline.push({
    $lookup: {
      from: 'communities',
      localField: 'communityId',
      foreignField: '_id',
      as: 'communityId',
    },
  });
  pipeline.push({
    $unwind: { path: '$communityId', preserveNullAndEmptyArrays: true },
  });

  // Projection
  pipeline.push({
    $project: {
      content: 1,
      tags: 1,
      attachments: 1,
      likeCount: 1,
      bookmarkCount: 1,
      createdAt: 1,
      score: 1,
      'userId._id': 1,
      'userId.name': 1,
      'userId.avatar': 1,
      'userId.slug': 1,
      'pageId.name': 1,
      'pageId.avatar': 1,
      'pageId.slug': 1,
      'communityId.name': 1,
      'communityId.avatar': 1,
      'communityId.slug': 1,
      
    },
  });

  return pipeline;
};
