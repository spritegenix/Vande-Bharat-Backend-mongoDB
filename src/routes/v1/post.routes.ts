import { Router } from 'express';
import { fetchPostById, fetchPosts } from '@/controllers/v1/post.controller';

const router = Router();

router.get('/', fetchPosts);            // Feed with cursor pagination
router.get('/:id', fetchPostById);      // Individual post by ID

export default router;
