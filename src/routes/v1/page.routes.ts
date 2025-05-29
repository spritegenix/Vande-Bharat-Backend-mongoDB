import { Request, Response, Router } from 'express';
import { requireAuth } from '@clerk/express';
import { validateRequest } from '@/middlewares/validateRequest';
import { env } from '@/config/zodSafeEnv';
import { addMediaToCategoryHandler, createCategoryHandler, createPageHandler, createProductHandler, deleteCategoryHandler, deleteProductHandler, fetchPageFollowers, getCategoriesByPage, getProductByIdHandler, getProductsHandler, removeMediaFromCategoryHandler, reorderCategoriesHandler, toggleFollowPageHandler, updateCategoryHandler, updatePageHandler, updateProductHandler } from '@/controllers/v1/page.controller';
import { createCategorySchema, createPageSchema, createProductSchema, reorderCategoriesSchema, updateCategorySchema, updatePageSchema, updateProductSchema } from '@/validators/v1/page.validators';

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
router.patch('/:slug/categories/order/reorder', requireAuth(), validateRequest(reorderCategoriesSchema, 'body'), reorderCategoriesHandler);

// GET /api/v1/pages/:slug/categories/all
router.get('/:slug/categories/all', getCategoriesByPage);

// ------------------ PRODUCT ------------------ //

// POST /api/v1/pages/:slug/products/create-product
router.post('/:slug/products/create-product', requireAuth(), validateRequest(createProductSchema, 'body'), createProductHandler);

// PATCH /api/v1/pages/products/:productId
router.patch('/products/:productId', requireAuth(), validateRequest(updateProductSchema, 'body'), updateProductHandler);

// DELETE /api/v1/pages/:slug/products/:productId
router.delete('/:slug/products/:productId', requireAuth(), deleteProductHandler);

// GET /api/v1/pages/:slug/products
// GET /api/v1/pages/:slug/products?fields=price,currency,isInOffer
// GET /api/v1/pages/:slug/products?search=wireless+earbuds // frontend = replace space with +
// GET /api/v1/pages/:slug/products?cursor=<next_product_id>&limit=5
router.get('/:slug/products/all-with-search', getProductsHandler);

// GET /api/v1/pages/products/:productId
router.get('/products/:productId', getProductByIdHandler);

// ------------------ CATEGORY ROUTES WITH PRODUCT / MEDIA ------------------------ //
// PATCH /api/v1/pages/:slug/categories/:categoryId/media/add-media
/*
{
  "media": [
    {
      "url": "https://s3.amazonaws.com/your-bucket/image1.jpg",
      "type": "IMAGE",
      "fileName": "image1.jpg",
      "mimeType": "image/jpeg",
      "size": 102400,
      "width": 800,
      "height": 600
    }
  ]
}
*/
router.patch( '/:slug/categories/:categoryId/media/add-media', requireAuth(), addMediaToCategoryHandler );

// PATCH /api/v1/pages/:slug/categories/:categoryId/media/remove-media
/*
{
  "mediaUrl": "https://s3.amazonaws.com/your-bucket/image1.jpg"
}
*/
router.patch( '/:slug/categories/:categoryId/media/remove-media', requireAuth(), removeMediaFromCategoryHandler );







// GET /api/v1/pages/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});

export default router;


/*
page id: 6834955711b6bef7729cf27c - tech-enthusiasts
category id : 683497db8860b4f860be6da7
product id : 6835f85eb88357a2566d6ae0

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