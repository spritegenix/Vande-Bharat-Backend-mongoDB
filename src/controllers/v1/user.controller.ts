import { RequestHandler } from 'express';
import * as userService from '@/services/v1/user.service';
import { getAuth } from '@clerk/express';
import httpStatus from 'http-status';
import { updateUserSchema } from '@/validators/v1/user.validator';
import { asyncHandler } from '@/utils/asyncHandler';

const getMyProfile: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized, user not found' });
        return;
    }
    const user = await userService.getUserByClerkId(userId);
    res.status(httpStatus.OK).json({ success: true, data: user });
})

const updateUser: RequestHandler = asyncHandler(async (req, res) => {
    const userSlug = req.params.slug;
    const { body: updates } = updateUserSchema.parse({ body: req.body });

    const updatedUser = await userService.updateUser(userSlug, updates);

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
    });

})

export { getMyProfile, updateUser };