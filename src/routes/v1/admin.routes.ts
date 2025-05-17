import { Router } from 'express';
import * as userController from '@/controllers/v1/admin/admin.controller';
import { requireAuth } from '@clerk/express';
import { requireRole } from '@/middlewares/requireRole';

const router = Router();
const role = "admin"

router.get('/', requireAuth(), requireRole(role), userController.getAllUsers);
router.get('/:id', requireAuth(), userController.getUserById);
router.put('/:id', requireAuth(), requireRole(role), userController.updateUser);
router.delete('/:id', requireAuth(), requireRole(role), userController.softDeleteUser);

export default router;