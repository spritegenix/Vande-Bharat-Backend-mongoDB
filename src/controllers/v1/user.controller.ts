import { RequestHandler } from 'express';
import * as userService from '@/services/v1/user.service';
import { getAuth, User } from '@clerk/express';
import httpStatus from 'http-status';
import { asyncHandler } from '@/utils/asyncHandler';
import { updateUserSchema } from '@/validators/v1/user.validator';
import { ALLOWED_FIELDS, DEFAULT_FIELDS } from '@/constants';

// GET /api/v1/users/me
const getMyProfile: RequestHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }
  const requestedFields = (req.query.fields as string)?.split(',') || [];
  const safeFields = requestedFields.filter((field) => ALLOWED_FIELDS.has(field));
  const fieldsToSelect = safeFields.length > 0 ? safeFields.join(' ') : DEFAULT_FIELDS;

  const user = await userService.getUserByClerkId(userId, fieldsToSelect);
  res.status(httpStatus.OK).json({ success: true, data: user });
});

// PATCH /api/v1/users/me
const updateUser: RequestHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json({ message: 'Validation failed', errors: parsed.error.errors });
  }

  const updatedUser = await userService.updateUser(userId, parsed.data);

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser,
  });
});

const getSuggestions:RequestHandler = asyncHandler(async(req,res)=> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    return;
  }
    const suggestions = await userService.getUserSuggestions(userId);

  res.status(httpStatus.OK).json({
    success: true,
    data: suggestions,
  });
})

const handleDelete: RequestHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { id: toUserId } = req.params;

  if (!userId) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
  }

  const deletedRequest = await userService.deleteSuggestion(userId, toUserId);

  return res.status(httpStatus.OK).json({
    success: true,
    message: "Deleted Suggestion",
    data: deletedRequest,
  });
});



const getFollowingUsers: RequestHandler = asyncHandler(async (req, res) => {
  //get user
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }
  //check his following list
  const followingUser = await userService.getFollowedProfiles(userId);
  res.status(httpStatus.OK).json({ success: true, data: followingUser });
});



const handleSendFollowRequest: RequestHandler = asyncHandler(async (req, res) => {
  const { userId: fromUserId  } = getAuth(req);
  const {toUserId} = req.params
 if (!fromUserId || !toUserId) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Missing required user IDs',
    });
  }
  const request  = await userService.sendFollowRequest(fromUserId, toUserId);
   res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Follow request sent',
    data: request,
  });
});

const getSentRequests:RequestHandler = asyncHandler(async(req,res)=> {
const {userId} = getAuth(req)
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }
  //check his following list
  const followingUser = await userService.sentRequests(userId);
  res.status(httpStatus.OK).json({ success: true, data: followingUser });
})


const handleRejectRequest:RequestHandler = asyncHandler(async(req,res)=>{
  const {userId} = getAuth(req)
  const {toUserId} = req.params
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }
  const rejectRequest = await userService.rejectRequest(userId, toUserId)
   res.status(httpStatus.OK).json({ success: true, data: rejectRequest });
})

const handleCancelFollowRequest:RequestHandler = asyncHandler(async(req,res)=> {
  const {userId} = getAuth(req)
   const {toUserId} = req.params
   if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }
  const requestCancel = await userService.cancelRequest(userId, toUserId)
    res.status(httpStatus.OK).json({ success: true, message: 'Follow request cancelled', data: requestCancel });
})

export { getMyProfile, updateUser, getFollowingUsers, handleSendFollowRequest, getSuggestions,getSentRequests, handleRejectRequest , handleCancelFollowRequest, handleDelete };
