import { UserModel } from "@/models/user.model";
import { ApiError } from "@/utils/ApiError";
import { UpdateUserInput } from "@/validators/v1/user.validator";
import httpStatus from "http-status";

const getUserByClerkId = async (clerkId: string) => {
  const user = await UserModel.findOne({ clerkId });
  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

const updateUser = async (slug: string, updates: UpdateUserInput) => {
  const user = await UserModel.findOneAndUpdate(
    { slug: slug, isDeleted: false },
    { $set: updates }, // Updates only the fields present in the updates object, leaving the others unchanged.
    { new: true }
  );
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

export {
  getUserByClerkId,
  updateUser,
};