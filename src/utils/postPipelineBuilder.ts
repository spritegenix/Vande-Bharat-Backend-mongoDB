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

  return pipeline;
};
