
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
import { PAGE_PRODUCTS_DEFAULT_FIELDS } from '@/constants';
import { buildPostPipeline } from '@/utils/postPipelineBuilder';
import { PostModel } from '@/models/post.model';

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

export const deletePageBySlug = async (slug: string, userId: string) => {
  const page = await Page.findOne({ slug, isDeleted: false });

  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  if (page.owner !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only owner can delete this page');
  }

  // Soft delete the page
  page.isDeleted = true;
  page.deletedAt = new Date();
  await page.save();

  // Soft delete related posts
  await PostModel.updateMany(
    { pageId: page._id },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  // Soft delete related products
  await Product.updateMany(
    { pageId: page._id },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  // If media is embedded in the page, it's already gone
  // If you use a separate Media model, add delete logic here too

  return { message: 'Page and related data deleted successfully' };
}

export const togglePageAdminBySlug = async (
  pageSlug: string,
  targetUserSlug: string,
  requesterUserId: string,
  remove = false
) => {
  const page = await Page.findOne({ slug: pageSlug, isDeleted: false });
  if (!page) throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');

  if (page.owner !== requesterUserId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only the page owner can manage admins');
  }

  const targetUser = await UserModel.findOne({ slug: targetUserSlug });
  if (!targetUser) throw new ApiError(httpStatus.NOT_FOUND, 'Target user not found');

  const targetUserId = targetUser._id.toString();

  if (targetUserId === page.owner) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Owner cannot be removed as admin');
  }

  const isAlreadyAdmin = page.admins.includes(targetUserId);

  if (remove) {
    if (!isAlreadyAdmin) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User is not an admin');
    }

    page.admins = page.admins.filter(id => id !== targetUserId);
    await page.save();
    return { success: true, message: 'Admin removed successfully' };
  } else {
    if (isAlreadyAdmin) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User is already an admin');
    }

    page.admins.push(targetUserId);
    await page.save();
    return { success: true, message: 'User promoted to admin' };
  }
};

export const getPageAdmins = async (pageSlug: string) => {
  const page = await Page.findOne({ slug: pageSlug, isDeleted: false });
  if (!page) throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');

  const adminIds = [page.owner, ...page.admins];

  const admins = await UserModel.find({ userId: { $in: adminIds } })
    .select('userId name slug avatar')
    .lean();

  return admins;
};


// --------------------FOLLOW AND FOLLOWERS----------------------------- //

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

export const getCategoriesByPage = async (slug: string) => {
  const page = await Page.findOne({ slug, isDeleted: false }).lean();

  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const categories = page.categories
    .sort((a, b) => a.order - b.order)
    .map((cat) => ({
      _id: cat._id,
      name: cat.name,
      type: cat.type,
      description: cat.description,
      isPublished: cat.isPublished,
      order: cat.order,
      itemCount:
        cat.type === 'PRODUCTS' ? cat.products.length : cat.media.length,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

  return categories;
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

export const addProductToCategory = async (
  pageId: Types.ObjectId,
  categoryId: string,
  productId: Types.ObjectId
) => {
  const page = await Page.findById(pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const category = page.categories.id(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  if (category.type !== 'PRODUCTS') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category type is not PRODUCTS');
  }

  const alreadyExists = category.products.some((product) => product.productId.toString() === productId.toString());
  if (alreadyExists) {
    throw new ApiError(httpStatus.CONFLICT, 'Product already exists in category');
  }

  category.products.push({
    productId,
    order: category.products.length,
  });

  await page.save();
  return category.products;
};

export const removeProductFromCategory = async (
  pageId: Types.ObjectId,
  categoryId: string,
  productId: Types.ObjectId
) => {
  const page = await Page.findById(pageId);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const category = page.categories.id(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  if (category.type !== 'PRODUCTS') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category type is not PRODUCTS');
  }

  const initialLength = category.products.length;

  category.products = category.products.filter(
    (p) => p.productId.toString() !== productId.toString()
  );

  if (category.products.length === initialLength) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found in category');
  }

  // Reassign order after removal
  category.products = category.products
    .map((p, i) => ({
      ...p,
      order: i,
    }));

  await page.save();
  return category.products;
};

// --------------------------------------------- 
export const reorderCategoryItems = async (
  pageId: Types.ObjectId,
  categoryId: string,
  items: { id: string; order: number }[]
) => {
  const page = await Page.findById(pageId);
  if (!page) throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');

  const category = page.categories.id(categoryId);
  if (!category) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');

  if (category.type === 'PRODUCTS') {
    // ✅ Map to { productId, order }
    const updated = items.map((entry) => ({
      productId: new Types.ObjectId(entry.id),
      order: entry.order,
    }));
    category.products = updated;
  } else if (category.type === 'MEDIA') {
    // ✅ Find & preserve original media while updating order
    const updated = items.map((entry) => {
      const media = category.media.find((m) => m._id?.toString() === entry.id);
      if (!media) throw new ApiError(httpStatus.NOT_FOUND, `Media with id ${entry.id} not found`);
      return {
        ...media,
        order: entry.order,
      };
    });
    category.media = updated;
  }

  await page.save();
  return category;
};

export const getCategoryItems = async ({
  pageSlug,
  categoryId,
  limit,
  cursor,
  fields,
}: {
  pageSlug: string;
  categoryId: string;
  limit: number;
  cursor?: string;
  fields?: string;
}) => {
  const page = await Page.findOne({ slug: pageSlug, isDeleted: false }, { _id: 1, categories: 1 }).lean();
  if (!page) throw new Error('Page not found');

  const category = page.categories.find((cat) => cat._id.toString() === categoryId);
  if (!category) throw new Error('Category not found');

  const isMedia = category.type === 'MEDIA';

  if (isMedia) {
    // Return sorted media items by order asc
    const sortedMedia = [...category.media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return {
      items: sortedMedia,
      nextCursor: null,
    };
  }

  // Handle PRODUCT type
  const sortedProducts = [...category.products].sort((a, b) => a.order - b.order);
  const cursorObj = cursor ? decodeCursor(cursor) : null;

  const filteredProducts = sortedProducts.filter((item) => {
    if (!cursorObj) return true;
    return item.order > (cursorObj.order ?? 0);
  });

  const paginated = filteredProducts.slice(0, limit);
  const productIds = paginated.map((p) => p.productId);

  const selectFields = fields ? fields.split(',').join(' ') : PAGE_PRODUCTS_DEFAULT_FIELDS;
  const products = await Product.find({ _id: { $in: productIds } })
    .select(selectFields)
    .lean();

  // Maintain order of original category.product list
  const orderedProducts = productIds
    .map((id) => products.find((p) => new Types.ObjectId(p._id).equals(id)))
    .filter(Boolean);

  const lastItem = filteredProducts[limit - 1];

  const nextCursor = filteredProducts.length > limit
    ? encodeCursor({
      _id: lastItem.productId,
      createdAt: lastItem.createdAt, // must be available
    })
    : null;

  return {
    items: orderedProducts,
    nextCursor,
  };
};

// --------------------------------------------  

export const getPostsByPageSlug = async ({
  pageSlug,
  cursor,
  limit,
  sort,
}: {
  pageSlug: string;
  cursor?: string;
  limit: number;
  sort: 'newest' | 'popular';
}) => {
  // 1. Find the Page by slug
  const page = await Page.findOne({ slug: pageSlug, isDeleted: false });
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const match = { pageId: page._id, isDeleted: false };

  const excludeIds: Types.ObjectId[] = [];

  if (cursor) {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
    if (decoded?._id) excludeIds.push(new Types.ObjectId(decoded._id as string));
  }


  const pipeline = buildPostPipeline({ match, sort, limit: limit + 1, excludeIds });

  const posts = await PostModel.aggregate(pipeline);

  let nextCursor: string | null = null;
  if (posts.length > limit) {
    const last = posts[limit - 1];
    nextCursor = encodeCursor(
      sort === 'popular'
        ? { score: last.score, _id: last._id, createdAt: last.createdAt }
        : { _id: last._id, createdAt: last.createdAt }
    );
    posts.pop(); // Remove extra item
  }

  return { posts, nextCursor };
};