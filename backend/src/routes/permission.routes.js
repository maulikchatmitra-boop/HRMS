import { Router } from 'express';
import * as permissionController from '../controllers/permission.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';

const router = Router();

// Retrieve global static list of permissions
router.get('/', authenticate, authorize('role.view'), permissionController.getPermissions);

export default router;
