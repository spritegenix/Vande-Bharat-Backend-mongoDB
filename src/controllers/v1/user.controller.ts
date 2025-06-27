import { RequestHandler } from 'express';
import * as userService from '@/services/v1/user.service';
import { getAuth, User } from '@clerk/express';
import httpStatus from 'http-status';
import { asyncHandler } from '@/utils/asyncHandler';
import { generalPaginationSchema, toUserIdParamsSchema, updateUserSchema,  } from '@/validators/v1/user.validator';
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

const getIndividualProfile:RequestHandler = asyncHandler(async (req, res) => {
  const { id: userId } = req.params;
  if (!userId) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'User ID is required' });
  }
  const individualProfile = await userService.getUserById(userId);
  if (!individualProfile) {
    return res.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
  }
  res.status(httpStatus.OK).json({
    success: true,
    data: individualProfile,
  });
})


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
  const parseResult = generalPaginationSchema.safeParse(req.query);
   if (!parseResult.success) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid query params",
      errors: parseResult.error.flatten().fieldErrors,
    });
  }
    const { cursor, limit } = parseResult.data;

   const { data, nextCursor } = await userService.getUserSuggestions({userId, limit, cursor});
  res.status(httpStatus.OK).json({
    success: true,
    data,
    nextCursor, 
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



const getUserFollowing: RequestHandler = asyncHandler(async (req, res) => {
  //get user
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }

  const parseResult = generalPaginationSchema.safeParse(req.query)
  if (!parseResult.success) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid query params",
      errors: parseResult.error.flatten().fieldErrors,
    });
  }
  //check his following list
  const {cursor, limit} = parseResult.data
  const {data, nextCursor} = await userService.getFollowingProfiles({userId, limit, cursor});
  res.status(httpStatus.OK).json({ success: true, data, nextCursor });
});


const getUserFollower: RequestHandler = asyncHandler(async (req, res) => {
  //get user
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }

  const parseResult = generalPaginationSchema.safeParse(req.query)
  if (!parseResult.success) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid query params",
      errors: parseResult.error.flatten().fieldErrors,
    });
  }
  //check his following list
  const {cursor, limit} = parseResult.data
  const {data, nextCursor} = await userService.getFollowerProfiles({userId, limit, cursor});
  res.status(httpStatus.OK).json({ success: true, data, nextCursor });
});

const handleUserUnfriend:RequestHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }
  
  const parseResult = toUserIdParamsSchema.safeParse(req.params)
  if (!parseResult.success) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid query params",
      errors: parseResult.error.flatten().fieldErrors,
    });
  }
  const {  toUserId } = parseResult.data;
  const unfriended = await userService.unfriendUser({userId, toUserId});
  res.status(httpStatus.OK).json({ success: true, data:unfriended, message: 'User unfriended successfully' });

})


const handleSendFollowRequest: RequestHandler = asyncHandler(async (req, res) => {
  const { userId: fromUserId  } = getAuth(req);
  const {toUserId} = req.params
 if (!fromUserId || !toUserId) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Missing required user IDs',
    });
  }
  if( fromUserId === toUserId) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'You cannot send a follow request to yourself',
    });
  }
  const request  = await userService.sendFollowRequest(fromUserId, toUserId);
   res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Follow request sent',
    data: request,
  });
});

const handleAcceptRequest: RequestHandler = asyncHandler(async (req, res) => {
const { userId } = getAuth(req)
const { fromUserId } = req.params

if (!userId) {
  res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
  return;
}
const acceptRequest = await userService.acceptRequest(userId, fromUserId);
res.status(httpStatus.OK).json({
  success: true,
  message: 'Follow request accepted',
  data: acceptRequest,
});
})
const getSentRequests:RequestHandler = asyncHandler(async(req,res)=> {
const {userId} = getAuth(req)
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }
const parseResult = generalPaginationSchema.safeParse(req.query)
  if (!parseResult.success) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid query params",
      errors: parseResult.error.flatten().fieldErrors,
    });
  }
  const { cursor, limit } = parseResult.data;
  //check his following list
  const {data, nextCursor} = await userService.sentRequests({userId, limit, cursor});
  res.status(httpStatus.OK).json({ success: true,   data,
    nextCursor,  });
})

const getRecievedRequests:RequestHandler = asyncHandler(async(req,res)=> {
const {userId} = getAuth(req)
  if (!userId) {
    res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
    return;
  }
  const parseResult = generalPaginationSchema.safeParse(req.query)
  if (!parseResult.success) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid query params",
      errors: parseResult.error.flatten().fieldErrors,
    });
  }
      const { cursor, limit } = parseResult.data;

  //check his following list
  const {data, nextCursor} = await userService.getRecievedRequests({userId, limit, cursor});
    res.status(httpStatus.OK).json({ success: true,   data,
    nextCursor,  });
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

export { getMyProfile, updateUser, getUserFollowing, handleSendFollowRequest, getSuggestions,getSentRequests, handleRejectRequest , handleCancelFollowRequest, handleDelete, handleAcceptRequest, getRecievedRequests, handleUserUnfriend, getUserFollower,getIndividualProfile};
