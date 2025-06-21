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
  $or: [
    { status: { $in: ['PENDING'] } },
    { isDeleted: true },
  ],
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
        status: 'PENDING',
        isDeleted: false,
      },
    },
    {
      // Lookup for reverse request where they rejected
      $lookup: {
        from: "followrequests",
        let: { recipient: "$toUserId", me: "$fromUserId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$fromUserId", "$$recipient"] },
                  { $eq: ["$toUserId", "$$me"] },
                  {
                    $or: [
                      { $eq: ["$status", "CANCELLED"] },
                      { $eq: ["$isDeleted", true] },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: "rejectionRecord",
      },
    },
    {
      $match: {
        rejectionRecord: { $eq: [] }, // exclude if reverse rejection exists
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
    {
      $lookup: {
        from: "users",
        localField: "toUserId",
        foreignField: "_id",
        as: "toUser",
      },
    },
    { $unwind: "$toUser" },
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

const acceptRequest = async (userId: string, fromUserId: string) => {
  const toUserId = await UserModel.findOne({ userId }).select("_id").lean();
  if (!toUserId) throw new ApiError(httpStatus.CONFLICT, "no user found");
 
  const request = await FollowRequestModel.findOneAndUpdate(
    { fromUserId, toUserId, status: "PENDING" },
    { status: "ACCEPTED" },
    { new: true }
  );
  
  if (!request) throw new ApiError(httpStatus.NOT_FOUND, "No pending follow request found");
  // Add to following list
  const User = await UserModel.findOne({ _id: fromUserId }).select("_id").lean();
  if (!User) throw new ApiError(httpStatus.NOT_FOUND, "To user not found")

  await UserModel.updateOne(
    { _id: User._id },
    { $addToSet: { following: toUserId._id } }
  );
  await UserModel.updateOne(
  { _id: toUserId._id },
  { $addToSet: { followers: User._id } }
);

 return {
    request,
    message: "Follow request accepted successfully",
  };

}
const getRecievedRequests = async (userId: string) => {
  const user = await UserModel.findOne({ userId }).select("_id").lean();
  if (!user) throw new ApiError(httpStatus.CONFLICT, "No user found");
  const receivedRequests = await FollowRequestModel.aggregate([
    {
      $match: {
        toUserId: user._id,
        status: "PENDING",
        isDeleted: false,
      },
    },
    {
      // Lookup if this user already cancelled the same request
      $lookup: {
        from: "followrequests",
        let: { requester: "$fromUserId", me: "$toUserId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$fromUserId", "$$me"] },
                  { $eq: ["$toUserId", "$$requester"] },
                  { $or: [
                    { $eq: ["$status", "CANCELLED"] },
                    { $eq: ["$isDeleted", true] },
                  ] },
                ],
              },
            },
          },
        ],
        as: "myCancelRecord",
      },
    },
    {
      $match: {
        myCancelRecord: { $eq: [] }, // Only keep those with no cancellation by me
      },
    },
    { $sort: { updatedAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "fromUserId",
        foreignField: "_id",
        as: "fromUser",
      },
    },
    { $unwind: "$fromUser" },
    {
      $project: {
        _id: 1,
        fromUserId: 1,
        toUserId: 1,
        updatedAt: 1,
        "fromUser.slug": 1,
        "fromUser.avatar": 1,
        "fromUser.banner": 1,
        "fromUser.name": 1,
      },
    },
  ]);
  return receivedRequests;
}

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
  const result = await FollowRequestModel.findOneAndUpdate({fromUserId, toUserId,status: 'PENDING', isDeleted: false,  }, {
    status: "CANCELLED",
    updatedAt: new Date()
  }, {new:true})
  if (!result) {
    throw new Error('No pending follow request to cancel');
  }

  return result;
}


export { getUserByClerkId, updateUser, getFollowedProfiles, sendFollowRequest, getUserSuggestions, sentRequests, rejectRequest, cancelRequest, deleteSuggestion, acceptRequest, getRecievedRequests };
