import { RequestHandler } from 'express';
import { getAuth } from '@clerk/express';
import { asyncHandler } from '@/utils/asyncHandler';
import { addMediaToCategory, createCategory, createPage, createProduct, deleteCategory, deleteProduct, getPageFollowers, getProductById, getProductsByPageSlug, removeMediaFromCategory, reorderCategories, toggleFollowPage, updateCategory, updatePage, updateProduct } from '@/services/v1/page.service';
import { createCategorySchema, createPageSchema, createProductSchema, reorderCategoriesSchema, updateCategorySchema, updateProductSchema } from '@/validators/v1/page.validators';
import httpStatus from 'http-status';
import { Page } from '@/models/page/page.model';
import { ApiError } from '@/utils/ApiError';

// Middleware 
export const assertPageAdmin = async (pageSlug: string, userId: string) => {
  const page = await Page.findOne({ slug: pageSlug, isDeleted: false });

  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const isOwner = page.owner === userId;
  const isAdmin = page.admins.includes(userId);

  if (!isOwner && !isAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only owner or admin can perform this action');
  }

  return page;
};
// ---------------------- //
export const createPageHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }
  const parsed = createPageSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    throw new ApiError(httpStatus.BAD_REQUEST, 'Validation error', errors);
  }


  const page = await createPage(userId, req.body);
  res.status(httpStatus.CREATED).json({ success: true, data: page });
});

export const updatePageHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }
  const { slug } = req.params;
  const parsed = createPageSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    throw new ApiError(httpStatus.BAD_REQUEST, 'Validation error', errors);
  }


  const updatedPage = await updatePage(userId, slug, req.body);
  res.status(200).json({ success: true, data: updatedPage });
});

export const toggleFollowPageHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const { slug } = req.params;

  const result = await toggleFollowPage(userId, slug);

  res.status(200).json({
    success: true,
    ...result,
    message: result.followed ? 'You followed the page' : 'You unfollowed the page'
  });
});

export const fetchPageFollowers = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { limit = '20', cursor } = req.query;

  const result = await getPageFollowers({
    slug: slug,
    limit: parseInt(limit as string),
    cursor: cursor as string | undefined,
  });

  res.status(httpStatus.OK).json({
    success: true,
    data: result.followers,
    nextCursor: result.nextCursor,
  });
});

// ------------------ CATEGORY CONTROLLERS ------------------------ //
export const createCategoryHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }
  const { slug } = req.params;
  const page = await assertPageAdmin(slug, userId);
  const parsed = createCategorySchema.safeParse(req.body);

  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    throw new ApiError(httpStatus.BAD_REQUEST, 'Validation error', errors);
  }

  const category = await createCategory(page._id, parsed.data);

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category,
  });
});

export const updateCategoryHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized user' });
  }

  const { slug, categoryId } = req.params;
  const page = await assertPageAdmin(slug, userId);

  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    throw new ApiError(httpStatus.BAD_REQUEST, 'Validation error', errors);
  }

  const category = await updateCategory(page._id, categoryId, parsed.data);

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category,
  });
});

export const deleteCategoryHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const { slug, categoryId } = req.params;
  const page = await assertPageAdmin(slug, userId);

  await deleteCategory(page._id, categoryId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Category deleted successfully',
  });
});

export const reorderCategoriesHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Unauthorized user' });
  }
  const { slug } = req.params;
  console.log("prsed");

  const parsed = reorderCategoriesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: 'Validation error',
      errors: parsed.error.errors,
    });
  }

  const page = await assertPageAdmin(slug, userId);
  const reordered = await reorderCategories(page._id, parsed.data);

  res.status(200).json({
    success: true,
    message: 'Categories reordered successfully',
    data: reordered,
  });
});

export const getCategoriesByPage = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const page = await Page.findOne({ slug, isDeleted: false }).select('categories');

  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Page not found');
  }

  const categories = [...page.categories].sort((a, b) => a.order - b.order);

  res.status(200).json({
    success: true,
    message: 'Categories fetched successfully',
    data: categories,
  });
});


// ------------------ PRODUCT CONTROLLERS ------------------------ //
export const createProductHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { slug } = req.params;

  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const page = await assertPageAdmin(slug, userId);
  const parsed = createProductSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    throw new ApiError(httpStatus.BAD_REQUEST, 'Validation error', errors);
  }

  const product = await createProduct(page._id, parsed.data);

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
});

export const updateProductHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }
  const { productId } = req.params;

  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    throw new ApiError(400, 'Validation error', errors);
  }

  const updatedProduct = await updateProduct(userId, productId, parsed.data);

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct,
  });
});

export const deleteProductHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const { slug, productId } = req.params;

  const page = await assertPageAdmin(slug, userId);
  const deleted = await deleteProduct(page._id, productId);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Product deleted successfully',
    data: deleted,
  });
});

export const getProductsHandler = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { search, cursor, limit, fields } = req.query;

  const result = await getProductsByPageSlug({
    slug,
    search: search as string,
    cursor: cursor as string,
    limit: limit ? parseInt(limit as string, 10) : 10,
    fields: fields as string,
  });

  res.status(200).json({
    success: true,
    message: 'Products fetched successfully',
    data: result.products,
    nextCursor: result.nextCursor,
  });
});


export const getProductByIdHandler = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { fields } = req.query;

  const product = await getProductById(productId, fields as string);

  res.status(200).json({
    success: true,
    message: 'Product fetched successfully',
    data: product,
  });
});

// ------------------ CATEGORY CONTROLLERS WITH PRODUCT / MEDIA ------------------------ //
export const addMediaToCategoryHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { slug, categoryId } = req.params;
  const media = req.body.media;

  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const page = await assertPageAdmin(slug, userId);

  const addedMedia = await addMediaToCategory(page._id, categoryId, media);

  res.status(200).json({
    success: true,
    message: 'Media added to category successfully',
    data: addedMedia,
  });
});

export const removeMediaFromCategoryHandler = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { slug, categoryId } = req.params;
  const { mediaUrl } = req.body;

  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  if (!mediaUrl) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'mediaUrl is required');
  }

  const page = await assertPageAdmin(slug, userId);

  const updatedMedia = await removeMediaFromCategory(page._id, categoryId, mediaUrl);

  res.status(200).json({
    success: true,
    message: 'Media removed from category successfully',
    data: updatedMedia,
  });
});
