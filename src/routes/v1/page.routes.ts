import { Request, Response, Router } from 'express';
import { requireAuth } from '@clerk/express';
import { findRoute, validateRequest } from '@/middlewares/validateRequest';
import { env } from '@/config/zodSafeEnv';
import { addMediaToCategoryHandler, addProductToCategoryHandler, createCategoryHandler, createPageHandler, createProductHandler, deleteCategoryHandler, deletePageHandler, deleteProductHandler, fetchPageFollowers, fetchPagePosts, getAllCategoriesByPageSlugHandler, getCategoryItemsHandler, getPageAdminsHandler, getProductByIdHandler, getProductsHandler, removeMediaFromCategoryHandler, removeProductFromCategoryHandler, reorderCategoriesHandler, reorderCategoryItemsHandler, toggleFollowPageHandler, togglePageAdminHandler, updateCategoryHandler, updatePageHandler, updateProductHandler } from '@/controllers/v1/page.controller';
import { createCategorySchema, createPageSchema, createProductSchema, reorderCategoriesSchema, reorderCategoryItemsSchema, updateCategorySchema, updatePageSchema, updateProductSchema } from '@/validators/v1/page.validators';
import { requestLogger } from '@/middlewares/requestLogger';

const router = Router();

// POST /api/v1/pages/create-page
router.post('/create-page', requireAuth(), validateRequest(createPageSchema), createPageHandler);

// PATCH /api/v1/pages/:slug
router.patch('/:slug', requireAuth(), validateRequest(updatePageSchema), updatePageHandler);

// DELETE /api/v1/pages/:pageId
router.delete('/:pageSlug', requireAuth(), deletePageHandler);

// PATCH /api/v1/pages/:slug/admins/:userSlug - make user admin
// PATCH /api/v1/pages/:slug/admins/:userSlug?remove-admin=true  - remove user admin
router.patch('/:slug/admins/:userSlug', requireAuth(), togglePageAdminHandler);

// GET /api/v1/pages/:slug/admins
router.get('/:slug/admins/all', getPageAdminsHandler);

// --------------------FOLLOW AND FOLLOWERS----------------------------- //

// POST /api/v1/pages/:slug/follow-unfollow
router.post('/:slug/follow-unfollow', requireAuth(), toggleFollowPageHandler);

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
router.get('/:slug/categories/all', getAllCategoriesByPageSlugHandler);

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
router.patch('/:slug/categories/:categoryId/media/add-media', requireAuth(), addMediaToCategoryHandler);

// PATCH /api/v1/pages/:slug/categories/:categoryId/media/remove-media
/*
{ "mediaUrl": "https://s3.amazonaws.com/your-bucket/image1.jpg" }
*/
router.patch('/:slug/categories/:categoryId/media/remove-media', requireAuth(), removeMediaFromCategoryHandler);

// -------------------------------

// PATCH /api/v1/pages/:slug/categories/:categoryId/product/add-product
/*
{ "productId": "product_id" }
*/
router.patch('/:slug/categories/:categoryId/product/add-product', requireAuth(), addProductToCategoryHandler);

// PATCH /api/v1/pages/:slug/categories/:categoryId/products/remove-product
/*
 { "productId": "product_id" }
 */
router.patch('/:slug/categories/:categoryId/product/remove-product', requireAuth(), removeProductFromCategoryHandler);

// ------------------------------ PAGE CATEGORY ITEMS REORDER AND FETCH ------------------------------- //
// PATCH /api/v1/pages/:slug/categories/:categoryId/media-product/reorder
/*
{
  "items": [
    { "id": "6835f85eb88357a2566d6ae0", "order": 0 },
    { "id": "6835f85eb88357a2566d6ae0", "order": 1 }
  ]
}
*/
router.patch('/:slug/categories/:categoryId/media-product/reorder', requireAuth(), validateRequest(reorderCategoryItemsSchema, 'body'), reorderCategoryItemsHandler);

// GET /api/v1/pages/:slug/categories/:categoryId/all/items?limit=10&cursor=<next_item_id>&product_fields=<title,price,slug,...>
router.get('/:slug/categories/:categoryId/all/items', getCategoryItemsHandler)

// ------------------------------------------------------------------------ //
// GET /api/v1/pages/:slug/posts
// GET /api/v1/pages/:slug/posts?limit=10&sort=<newest|popular>
// GET /api/v1/pages/:slug/posts?limit=10&sort=<newest|popular>&cursor=<next_post_id>
router.get('/:slug/posts', fetchPagePosts); 















// GET /api/v1/pages/health
router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "OK", environment: env.NODE_ENV, });
});

export default router;


/*
page id: 6834955711b6bef7729cf27c - tech-enthusiasts
category id : 6834a090e98479dd0e659213
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