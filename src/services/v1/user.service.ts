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
  const currentUser = await UserModel.findOne({ userId })
    .select('following _id')
    .lean();

  if (!currentUser) return [];

  const currentUserId = new mongoose.Types.ObjectId(currentUser._id);

  const sentRequestUserIds = await FollowRequestModel.find({
    fromUserId: currentUserId,
    status: { $in: ['PENDING', 'CANCELLED'] },
    isDeleted: false,
  }).distinct('toUserId');

  const excludeIds: mongoose.Types.ObjectId[] = [
    currentUserId,
    ...(currentUser.following || []),
    ...sentRequestUserIds,
  ];

  const suggestions = await UserModel.aggregate([
    {
      $match: {
        _id: { $nin: excludeIds },
        isDeleted: false,
        isBlocked: false,
      },
    },
    { $sample: { size: 10 } },
    {
      $project: {
        _id: 1,
        name: 1,
        avatar: 1,
        slug: 1,
      },
    },
  ]);

  return suggestions;
};


const deleteSuggestion = async (fromUserId: string, toUserId: string) => {
  const user = await UserModel.findOne({ userId: fromUserId }).select("_id").lean();
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  let result = await FollowRequestModel.findOneAndUpdate(
    {
      fromUserId: user._id,
      toUserId: toUserId,
        status: { $in: ['PENDING', 'CANCELLED'] },
      isDeleted: false,
    },
    {
      isDeleted: true,
      updatedAt: new Date(),
      deletedAt:new Date()
    },
    { new: true }
  );

  if (!result) {
    // No request existed → create a new soft-deleted request
    result = await FollowRequestModel.create({
      fromUserId: user._id,
      toUserId: toUserId,
      status: 'CANCELLED',
      isDeleted: true,
      deletedAt: new Date(),
    });
  }
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Follow request not found or already deleted");
  }

  return result;
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
    isDeleted: false
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
  if (!user) throw new ApiError(httpStatus.CONFLICT, "No user found");

  const sentRequests = await FollowRequestModel.aggregate([
    {
      $match: {
        fromUserId: user._id,
        isDeleted: false,
        status: 'PENDING',
      },
    },
    {
      $sort: { updatedAt: -1 }, // ✅ sort by most recent updates
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
      $unwind: "$toUser",
    },
    {
      $project: {
        _id: 1,
        fromUserId: 1,
        toUserId: 1,
        updatedAt: 1,
        "toUser.slug": 1,
        "toUser.avatar": 1,
        "toUser.banner": 1,
        "toUser.name": 1,
      },
    },
  ]);

  return sentRequests;
};


const rejectRequest = async(userId:string, toUserId:string)=> {

const fromUserId = await UserModel.findOne({userId}).select("_id").lean()
  if (!fromUserId) throw new ApiError(httpStatus.CONFLICT, "no user found");

  const request = await FollowRequestModel.findOneAndUpdate({fromUserId, toUserId,status: "PENDING"}, {status:"REJECTED"}, {new:true})
    if (!request) throw new Error('No pending follow request found');
  return request;
}

const cancelRequest = async(userId:string, toUserId:string)=> {
  const fromUserId = await UserModel.findOne({userId}).select("_id").lean()
  if (!fromUserId) throw new ApiError(httpStatus.CONFLICT, "no user found");
  console.log("fromuser", fromUserId, "toUser", toUserId)
  const result = await FollowRequestModel.findOneAndUpdate({fromUserId, toUserId,status: 'PENDING', isDeleted: false,  }, {
    status: "CANCELLED",
    updatedAt: new Date()
  }, {new:true})
  if (!result) {
    throw new Error('No pending follow request to cancel');
  }

  return result;
}


export { getUserByClerkId, updateUser, getFollowedProfiles, sendFollowRequest, getUserSuggestions, sentRequests, rejectRequest, cancelRequest, deleteSuggestion };
