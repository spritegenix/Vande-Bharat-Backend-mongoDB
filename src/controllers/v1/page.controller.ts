import { RequestHandler } from 'express';
import { getAuth } from '@clerk/express';
import { asyncHandler } from '@/utils/asyncHandler';
import { createCategory, createPage, deleteCategory, getPageFollowers, reorderCategories, toggleFollowPage, updateCategory, updatePage } from '@/services/v1/page.service';
import { createCategorySchema, createPageSchema, reorderCategoriesSchema, updateCategorySchema } from '@/validators/v1/page.validators';
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

