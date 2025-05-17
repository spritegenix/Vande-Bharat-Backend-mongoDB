import { UserModel } from '@/models/user.model';
import { ApiError } from '@/utils/ApiError';
import { UpdateUserInput } from '@/validators/v1/user.validator';
import httpStatus from 'http-status';

export const getAllUsers = async () => {
  return await UserModel.find({ isDeleted: false });
};

export const getUserById = async (id: string) => {
  const user = await UserModel.findById(id);
  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

export const updateUser = async (id: string, updates:UpdateUserInput) => {
  const user = await UserModel.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: updates },
    { new: true }
  );
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

export const softDeleteUser = async (id: string) => {
  const user = await UserModel.findOneAndUpdate({ _id: id }, { isDeleted: true }, { new: true });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};
