import { RequestHandler } from 'express';
import * as userService from '@/services/v1/user.service';
import { getAuth } from '@clerk/express';
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
        return res.status(400).json({ message: 'Validation failed', errors: parsed.error.errors });
    }

    const updatedUser = await userService.updateUser(userId, parsed.data);

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
    });
})

export { getMyProfile, updateUser };