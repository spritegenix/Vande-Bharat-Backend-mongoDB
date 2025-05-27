
import { Types } from 'mongoose';
import { Page } from '@/models/page/page.model';
import { UserModel } from '@/models/user.model';
import { ApiError } from '@/utils/ApiError';
import { generateSlug } from '@/utils/generateSlug';
import { CreateCategoryInput, CreatePageInput, ReorderCategoriesInput, UpdateCategoryInput, UpdatePageInput } from '@/validators/v1/page.validators';
import httpStatus from 'http-status';

export const createPage = async (userId: string, data: CreatePageInput) => {
  const { name, description, tags, avatar, banner, isHidden } = data;

  const slug = await generateSlug(name);

  const page = await Page.create({
    name,
    slug,
    description: description || null,
    tags,
    avatar: avatar || null,
    banner: banner || null,
    isHidden: isHidden ?? false,
    owner: userId,
  });

  return page;
};

export const updatePage = async (
  userId: string,
  slug: string,
  data: UpdatePageInput
) => {
  const page = await Page.findOne({ slug, isDeleted: false });

  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }


  if (page.owner !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update this page');
  }

  if (data.description !== undefined) page.description = data.description;
  if (data.tags !== undefined) page.tags = data.tags;
  if (data.avatar !== undefined) page.avatar = data.avatar;
  if (data.banner !== undefined) page.banner = data.banner;
  if (data.isHidden !== undefined) page.isHidden = data.isHidden;

  await page.save();

  return page;
};

export const toggleFollowPage = async (userId: string, pageSlug: string) => {
  const page = await Page.findOne({ slug: pageSlug, isDeleted: false });
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const alreadyFollowing = page.followers.includes(userId);

  if (alreadyFollowing) {
    page.followers = page.followers.filter((id) => id !== userId);
    page.followersCount = Math.max(0, page.followersCount - 1);
  } else {
    page.followers.push(userId);
    page.followersCount += 1;
  }

  await page.save();

  return { followed: !alreadyFollowing, followersCount: page.followersCount };
};

export const getPageFollowers = async ({ slug, limit, cursor, }: { slug: string; limit: number; cursor?: string; }) => {
  const page = await Page.findOne({ slug, isDeleted: false });

  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'page not found');
  }

  const allUserIds: string[] = [
    page.owner,
    ...page.admins.filter((id) => id !== page.owner),
    ...page.followers.filter((id) => id !== page.owner && !page.admins.includes(id)),
  ];

  const startIndex = cursor ? allUserIds.indexOf(cursor) + 1 : 0;
  const paginatedIds = allUserIds.slice(startIndex, startIndex + limit);
  const nextCursor = allUserIds[startIndex + limit] || null;

  const users = await UserModel.find({ userId: { $in: paginatedIds } })
    .select('userId name slug avatar')
    .lean();

  // maintain original order
  const userMap = new Map(users.map((u) => [u.userId, u]));
  const orderedUsers = paginatedIds.map((id) => userMap.get(id)).filter(Boolean);

  return {
    followers: orderedUsers,
    nextCursor,
  };
};

// ------------------ CATEGORY SERVICES ------------------------ //

export const createCategory = async (
  pageId: Types.ObjectId,
  data: CreateCategoryInput
) => {
  const page = await Page.findById(pageId);
  if (!page) throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  const nextOrder = page.categories.length; // or Math.max(...orders) + 1 if gaps are possible
  const category = {
    _id: new Types.ObjectId(),
    ...data,
    media: [],
    products: [],
    isPublished: false,
    order: nextOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await Page.findByIdAndUpdate(
    pageId,
    { $push: { categories: category } },
    { new: true }
  );

  return category;
};

export const updateCategory = async (
  pageId: Types.ObjectId,
  categoryId: string,
  update: UpdateCategoryInput
) => {
  const page = await Page.findById(pageId);
  if (!page) throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');

  const category = page.categories.id(categoryId);
  if (!category) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');

  const isTypeChanged = update.type && update.type !== category.type;

  // Update fields
  if (update.name) category.name = update.name;
  if (update.description !== undefined) category.description = update.description;

  if (update.type) {
    category.type = update.type;
    if (isTypeChanged) {
      category.products = [];
      category.media = [];
    }
  }

  if (update.isPublished) category.isPublished = update.isPublished

  category.updatedAt = new Date();

  await page.save();
  return category;
};

export const deleteCategory = async (pageId: Types.ObjectId, categoryId: string) => {
  const page = await Page.findById(pageId);
  if (!page) throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');

  const existing = page.categories.id(categoryId);
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');

  existing.deleteOne(); // Mongoose subdocument remove
  await page.save();
};

export const reorderCategories = async (
  pageId: Types.ObjectId,
  newOrders: ReorderCategoriesInput
) => {
  const page = await Page.findById(pageId);
  if (!page) throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
// console.log(newOrders);
  const idToOrderMap = new Map(newOrders.categories.map(({ categoryId, order }) => [categoryId, order]));

  for (const cat of page.categories) {
    const newOrder = idToOrderMap.get(cat._id.toString());
    if (newOrder !== undefined) {
      cat.order = newOrder;
    }
  }

  await page.save();

  return page.categories.map((c) => ({
    _id: c._id,
    name: c.name,
    order: c.order,
  }));
};

