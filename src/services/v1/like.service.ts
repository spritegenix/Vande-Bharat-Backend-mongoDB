import { LikeModel } from '@/models/like.model';
import { PostModel } from '@/models/post.model';
import { UserModel } from '@/models/user.model';
import { Types } from 'mongoose';

export const toggleLike = async (userId: string, postId: string) => {
    const user = await UserModel.findOne({ userId }).select('_id').lean();
    if (!user) {
        throw new Error(`User not found with userId: ${userId}`);
    }
    const existing = await LikeModel.findOne({ userId:user._id, postId, isDeleted: false });

    if (existing) {
        // Already liked → soft delete → unlike
        existing.isDeleted = true;
        existing.deletedAt = new Date();
        await existing.save();

        await PostModel.findByIdAndUpdate(postId, { $inc: { likeCount: -1 } });

        return { liked: false };
    }

    await LikeModel.findOneAndUpdate(
        { userId:user._id, postId },
        {
            userId:user._id,
            postId,
            isDeleted: false,
            deletedAt: null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await PostModel.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } });
    return { liked: true };
};

export const isPostLiked = async (userId: string, postId: string) => {
    const user = await UserModel.findOne({ userId }).select('_id').lean();
    if (!user) {
        throw new Error(`User not found with userId: ${userId}`);
    }
    const existing = await LikeModel.findOne({ userId:user._id, postId, isDeleted: false });
    return !!existing;
};

export const getPostLikes = async (postId: string, limit: number, cursor?: string) => {
    const query: any = { postId, isDeleted: false };

    if (cursor) {
        const [createdAt, _id] = cursor.split('_');
        query.$or = [
            { createdAt: { $lt: new Date(createdAt) } },
            {
                createdAt: new Date(createdAt),
                _id: { $lt: new Types.ObjectId(_id) },
            },
        ];
    }

    const likes = await LikeModel.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .populate({
            path: 'userId',
            model: 'User',
            localField: 'userId',
            foreignField: 'userId',
            justOne: true,
            select: 'name avatar',
        })
        .lean();

    const next =
        likes.length === limit
            ? `${likes[likes.length - 1].createdAt.toISOString()}_${likes[likes.length - 1]._id}`
            : null;

    return { likes, nextCursor: next };
};

export const getUserLikedPosts = async (
    userId: string,
    limit: number,
    cursor?: string
) => {
    const query: any = { userId, isDeleted: false };

    if (cursor) {
        const [createdAt, _id] = cursor.split('_');
        query.$or = [
            { createdAt: { $lt: new Date(createdAt) } },
            {
                createdAt: new Date(createdAt),
                _id: { $lt: new Types.ObjectId(_id) },
            },
        ];
    }

    const likes = await LikeModel.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .populate('postId')
        .populate({
            path: 'userId',
            model: 'User',
            localField: 'userId',
            foreignField: 'userId',
            justOne: true,
            select: 'name avatar slug',
        })
        .lean();

    const next =
        likes.length === limit
            ? `${likes[likes.length - 1].createdAt.toISOString()}_${likes[likes.length - 1]._id}`
            : null;

    return {
        likedPosts: likes,
        nextCursor: next,
    };
};
