import { RequestHandler } from 'express';
import * as userService from '@/services/v1/admin.service';
import { updateUserSchema } from '@/validators/v1/user.validator';

export const getAllUsers: RequestHandler = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getUserById: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUser: RequestHandler = async (req, res, next) => {
  try {
     const { body: validated } = updateUserSchema.parse({ body: req.body });
    const user = await userService.updateUser(req.params.id, validated);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const softDeleteUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.softDeleteUser(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
