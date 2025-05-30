
import { Types } from 'mongoose';
import { Page } from '@/models/page/page.model';
import { UserModel } from '@/models/user.model';
import { ApiError } from '@/utils/ApiError';
import { generateSlug } from '@/utils/generateSlug';
import { CreateCategoryInput, CreatePageInput, CreateProductInput, ReorderCategoriesInput, UpdateCategoryInput, UpdatePageInput, UpdateProductInput } from '@/validators/v1/page.validators';
import httpStatus from 'http-status';
import { Product } from '@/models/page/product.model';
import { decodeCursor, encodeCursor } from '@/utils/cursor';
import { buildSearchQuery } from '@/utils/buildSearchQuery';
import { IMedia } from '@/models/media.model';

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

// ------------------ PRODUCT SERVICES ------------------------ //

export const createProduct = async (
  pageId: Types.ObjectId,
  data: CreateProductInput
) => {
  const page = await Page.findById(pageId);
  if (!page) throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  const nextOrder = await Product.countDocuments({ pageId });
  const product = await Product.create({
    ...data,
    pageId,
    isPublished: true,
    order: nextOrder,
  });

  return product;
};

export const updateProduct = async (
  userId: string,
  productId: string,
  data: UpdateProductInput
) => {
  const product = await Product.findById(productId, { isDeleted: false });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  const page = await Page.findById(product.pageId);
  if (!page || page.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const isOwner = page.owner === userId;
  const isAdmin = page.admins.includes(userId);
  if (!isOwner && !isAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to update this product');
  }

  Object.assign(product, data);
  product.updatedAt = new Date();
  await product.save();

  return product;
};

export const deleteProduct = async (pageId: Types.ObjectId, productId: string) => {
  const product = await Product.findOne({
    _id: productId,
    pageId,
    isDeleted: false,
  });

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found or already deleted');
  }

  product.isDeleted = true;
  product.deletedAt = new Date();

  await product.save();
  return product;
};

export const getProductsByPageSlug = async ({
  slug,
  search,
  cursor,
  limit = 10,
  fields = 'attachments title slug',
}: {
  slug: string;
  search?: string;
  cursor?: string;
  limit?: number;
  fields?: string;
}) => {
  const page = await Page.findOne({ slug, isDeleted: false });
  if (!page) throw new Error('Page not found');



  const match: Record<string, any> = {
    pageId: page._id,
    isDeleted: false,
    isPublished: true,
    ...buildSearchQuery(search),
  };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      match.$or = [
        { createdAt: { $lt: decoded.createdAt } },
        {
          createdAt: decoded.createdAt,
          _id: { $lt: decoded._id },
        },
      ];
    }
  }

  const projection = fields
    .split(',')
    .reduce((acc, field) => ({ ...acc, [field.trim()]: 1 }), {});

  const products = await Product.find(match)
    .select(projection)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasNextPage = products.length > limit;
  const result = hasNextPage ? products.slice(0, -1) : products;

  const last = result[result.length - 1] as { _id: Types.ObjectId; createdAt: Date };

  const nextCursor = hasNextPage
    ? encodeCursor({
      _id: last._id,
      createdAt: last.createdAt,
    })
    : null;

  return {
    products: result,
    nextCursor,
  };
};

export const getProductById = async (productId: string, fields: string = 'attachments title slug') => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid product ID');
  }

  const product = await Product.findById(productId).select(
    fields ? fields.split(',').join(' ') : ''
  );

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return product;
};

// ------------------ CATEGORY SERVICES WITH PRODUCT / MEDIA ------------------------ //
export const addMediaToCategory = async (
  pageId: Types.ObjectId,
  categoryId: string,
  media: IMedia[]
) => {
  const page = await Page.findById(pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const category = page.categories.id(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  if (category.type !== 'MEDIA') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category type is not MEDIA');
  }

  if (category.media.length + media.length > 10) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Max 10 media items allowed in a category');
  }

  // Assign `order` field to each media if not present
  const nextOrder = category.media.length;
  const enrichedMedia = media.map((m, i) => ({
    ...m,
    order: nextOrder + i,
    uploadedAt: m.uploadedAt ?? new Date(),
  }));

  category.media.push(...enrichedMedia);
  await page.save();

  return category.media;
};

export const removeMediaFromCategory = async (
  pageId: Types.ObjectId,
  categoryId: string,
  mediaUrl: string
) => {
  const page = await Page.findById(pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const category = page.categories.id(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  if (category.type !== 'MEDIA') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category type is not MEDIA');
  }

  const originalLength = category.media.length;

  category.media = category.media.filter((m) => m.url !== mediaUrl);

  if (category.media.length === originalLength) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Media item not found in category');
  }

  // Reassign order after removal
  category.media = category.media
    .filter((m) => m.url !== mediaUrl)
    .map((m, index) => ({
      ...m,
      order: index,
    }));

  await page.save();
  return category.media;
};