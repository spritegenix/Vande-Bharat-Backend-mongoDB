import { Types } from 'mongoose';

export const buildPostPipeline = ({
  match,
  sort = 'newest',
  limit = 10,
  excludeIds = [],
}: {
  match: Record<string, any>;
  sort?: 'popular' | 'newest';
  limit?: number;
  excludeIds?: Types.ObjectId[];
}) => {
  const baseMatch = excludeIds.length
    ? { ...match, _id: { $nin: excludeIds } }
    : match;

  const scoreField = {
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
              1000 * 60 * 60 * 24, // age in days
            ],
          },
        ],
      },
    },
  };

  const sortStage =
    sort === 'popular'
      ? { $sort: { score: -1, _id: -1 } }
      : { $sort: { createdAt: -1, _id: -1 } };

  const pipeline: any[] = [{ $match: baseMatch }];

  if (sort === 'popular') {
    pipeline.push(scoreField);
  }

  pipeline.push(sortStage);
  pipeline.push({ $limit: limit });

  // ----------- Populate userId -------------
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: 'userId',
      as: 'userId',
    },
  });
  pipeline.push({
    $unwind: { path: '$userId', preserveNullAndEmptyArrays: true },
  });

  // ----------- Populate pageId -------------
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

  // ----------- Populate communityId -------------
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

  // ----------- Optional projection -------------
  pipeline.push({
    $project: {
      content: 1,
      tags: 1,
      attachments: 1,
      likeCount: 1,
      bookmarkCount: 1,
      createdAt: 1,
      score: 1,
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
