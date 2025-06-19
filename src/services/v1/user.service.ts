import { UserModel } from '@/models/user.model';
import { FollowRequestModel } from '@/models/userFollowRequestModel.model';
import { ApiError } from '@/utils/ApiError';
import { generateSlug } from '@/utils/generateSlug';
import { UpdateUserInput } from '@/validators/v1/user.validator';
import httpStatus from 'http-status';
import mongoose, { Types } from 'mongoose';

const getUserByClerkId = async (userId: string, fields: string) => {
  const user = await UserModel.findOne({ userId }).select(fields).lean();
  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

const updateUser = async (userId: string, updates: UpdateUserInput) => {
  // Regenerate slug if name is changed
  if (updates.name) {
    updates.slug = await generateSlug(updates.name);
  }
  const user = await UserModel.findOneAndUpdate(
    { userId, isDeleted: false },
    { $set: updates }, // Updates only the fields present in the updates object, leaving the others unchanged.
    { new: true },
  );
  return user;
};

const getFollowedProfiles = async (userId: string) => {
  const user = await UserModel.findOne({ userId }).select('following').lean();
  if (!user) return [];
  const followingUsers = await UserModel.find({ userId: { $in: user.following } })
    .select('name avatar slug')
    .lean();
  return followingUsers;
};

const getUserSuggestions = async (userId: string) => {
  const currentUser = await UserModel.findOne({ userId }).select('following _id').lean();
  if (!currentUser) return [];

  const excludeIds = [currentUser._id, ...(currentUser.following || [])];

  // Step 2: Find sent follow requests
  const sentRequests = await FollowRequestModel.find({
    fromUserId: currentUser._id,
    status: 'PENDING',
  })
    .select('toUserId')
    .lean();
  const sentRequestUserIds = sentRequests.map((req) => req.toUserId);
  excludeIds.push(...sentRequestUserIds);

  const suggestions = await UserModel.find({
    _id: { $nin: excludeIds },
    isDeleted: false,
    isBlocked: false,
  })
    .select('name avatar slug')
    .limit(10)
    .lean();

  return suggestions;
};

const sendFollowRequest = async (fromUserId: string, toUserId: string) => {
  if (fromUserId === toUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot follow yourself');
  }
  const fromUser = await UserModel.findOne({ userId: fromUserId }).select('_id');
  if (!fromUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const existing = await FollowRequestModel.findOne({
    fromUserId: fromUser._id,
    toUserId,
    status: 'PENDING',
  });
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, 'Follow request already sent');
  }
  const followRequest = await FollowRequestModel.create({
    fromUserId: fromUser._id,
    toUserId,
    status: 'PENDING',
  });
  return followRequest;
};

const sentRequests = async (userId: string) => {
  const user = await UserModel.findOne({ userId }).select("_id").lean();
  if (!user) throw new ApiError(httpStatus.CONFLICT, "no user found");

  const sentRequests = await FollowRequestModel.aggregate([
    {
      $match: {
        fromUserId: user._id,
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: "users", 
        localField: "toUserId",
        foreignField: "_id",
        as: "toUser",
      },
    },
    {
      $unwind: "$toUser", // convert to single object instead of array
    },
    {
      $project: {
        _id: 1,
        fromUserId: 1,
        toUserId: 1,
        "toUser.slug": 1,
        "toUser.avatar": 1,
        "toUser.banner": 1,
        "toUser.name": 1
      },
    },
  ]);

  return sentRequests;
};


export { getUserByClerkId, updateUser, getFollowedProfiles, sendFollowRequest, getUserSuggestions, sentRequests };
