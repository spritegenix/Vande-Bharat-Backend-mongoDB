import { UserModel } from "@/models/user.model";
import { ApiError } from "@/utils/ApiError";
import { generateSlug } from "@/utils/generateSlug";
import { UpdateUserInput } from "@/validators/v1/user.validator";
import httpStatus from "http-status";

const getUserByClerkId = async (clerkId: string, fields: string) => {
  const user = await UserModel.findOne({ clerkId }).select(fields).lean();
  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

const updateUser = async (clerkId: string, updates: UpdateUserInput) => {
  // Regenerate slug if name is changed
  if (updates.name) {
    updates.slug = await generateSlug(updates.name);
  }
  const user = await UserModel.findOneAndUpdate(
    { clerkId: clerkId, isDeleted: false },
    { $set: updates }, // Updates only the fields present in the updates object, leaving the others unchanged.
    { new: true }
  );
  return user;
};

export {
  getUserByClerkId,
  updateUser,
};