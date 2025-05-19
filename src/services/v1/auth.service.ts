import { UserModel } from '@/models/user.model';
import { clerkClient } from '@clerk/express';

export const syncUserService = async (userId: string) => {
  let user = await UserModel.findOne({ userId });

  if (user) return user;

  const clerkUser = await clerkClient.users.getUser(userId);

  user = await UserModel.create({
    userId,
    email: clerkUser.emailAddresses[0].emailAddress,
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
    avatar: clerkUser.imageUrl,
    role: 'user',
  });

  return user;
};
