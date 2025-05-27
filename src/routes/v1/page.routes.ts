import { Request, Response, Router } from 'express';
import { requireAuth } from '@clerk/express';
import { validateRequest } from '@/middlewares/validateRequest';
import { env } from '@/config/zodSafeEnv';
import { createCategoryHandler, createPageHandler, deleteCategoryHandler, fetchPageFollowers, getCategoriesByPage, reorderCategoriesHandler, toggleFollowPageHandler, updateCategoryHandler, updatePageHandler } from '@/controllers/v1/page.controller';
import { createCategorySchema, createPageSchema, reorderCategoriesSchema, updateCategorySchema, updatePageSchema } from '@/validators/v1/page.validators';

const router = Router();

// POST /api/v1/pages/create-page
router.post('/create-page', requireAuth(), validateRequest(createPageSchema), createPageHandler);

// PATCH /api/v1/pages/:slug
router.patch('/:slug', requireAuth(), validateRequest(updatePageSchema), updatePageHandler);

// POST /api/v1/pages/:slug/follow
router.post('/:slug/follow', requireAuth(), toggleFollowPageHandler);

// GET /api/v1/pages/:slug/followers?limit=10&cursor=user_abcd
router.get('/:slug/followers', fetchPageFollowers);

// ------------------ CATEGORY ------------------ //
// POST /api/v1/pages/:slug/categories/create-category
router.post('/:slug/categories/create-category', requireAuth(), validateRequest(createCategorySchema, 'body'), createCategoryHandler);

// PATCH /api/v1/pages/:slug/categories/:categoryId
router.patch('/:slug/categories/:categoryId', requireAuth(), validateRequest(updateCategorySchema, 'body'), updateCategoryHandler);

// DELETE /api/v1/pages/:slug/categories/:categoryId 
router.delete('/:slug/categories/:categoryId', requireAuth(), deleteCategoryHandler);

//  PATCH /api/v1/pages/:slug/categories/order/reorder
router.patch( '/:slug/categories/order/reorder', requireAuth(),validateRequest(reorderCategoriesSchema, 'body'), reorderCategoriesHandler );

// GET /api/v1/pages/:slug/categories/all
router.get('/:slug/categories/all', getCategoriesByPage);

// ------------------ CATEGORY ------------------ //



// GET /api/v1/pages/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});

export default router;


/*
page id: 6834955711b6bef7729cf27c - tech-enthusiasts
category id : 683497db8860b4f860be6da7

*/


// Role- 
/*
help me write schemas for page.
page create and update(name, description, tags, avatar, banner, isHidden) by owner only.
page can have products(like e-commerce) and media(videos and images).
owner or admins can add, update, remove, publish products and media.
category create and update(name, description, type, media, products), delete publish by owner or admin.
category can have either products(like e-commerce) and media(videos and images) but one type only.
if category type changes, clear products and media.
post handling by owner or admin both.
page creation --> product/media creation --> category creation --> assign products/media to category.
 */