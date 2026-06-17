import { Router } from 'express';
import * as roleController from '../controllers/role.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
} from '../validators/role.validator.js';

const router = Router();

// Secure all role routes with authentication
router.use(authenticate);

// ─── Explicit Action-Based Paths ─────────────────────────────────
router.post('/create', authorize('role.edit'), validate(createRoleSchema), roleController.createRole);
router.get('/list', authorize(['role.view', 'employee.create', 'employee.edit']), roleController.getRoles);
router.put('/update/:id', authorize('role.edit'), validate(updateRoleSchema), roleController.updateRole);
router.delete('/delete/:id', authorize('role.edit'), roleController.deleteRole);
router.post('/assign-permissions/:id', authorize('role.edit'), validate(assignPermissionsSchema), roleController.assignPermissionsToRole);
router.get('/permissions/:id', authorize('role.view'), roleController.getRolePermissions);

// All roles with their permissions — single API
router.get('/all-permissions', authorize('role.view'), roleController.getAllRolesWithPermissions);

// ─── Standard REST Endpoints (Backwards Compatibility) ───────────
router.post('/', authorize('role.edit'), validate(createRoleSchema), roleController.createRole);
router.get('/', authorize(['role.view', 'employee.create', 'employee.edit']), roleController.getRoles);
router.put('/:id', authorize('role.edit'), validate(updateRoleSchema), roleController.updateRole);
router.delete('/:id', authorize('role.edit'), roleController.deleteRole);
router.post('/:id/permissions', authorize('role.edit'), validate(assignPermissionsSchema), roleController.assignPermissionsToRole);
router.get('/:id/permissions', authorize('role.view'), roleController.getRolePermissions);

export default router;
