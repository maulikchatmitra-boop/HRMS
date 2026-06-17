import { Router } from 'express';
import * as branchController from '../controllers/branch.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createBranchSchema, updateBranchSchema } from '../validators/branch.validator.js';

const router = Router();

router.use(authenticate);

// Explicit Action-based endpoints
router.post('/create', authorize('branch.create'), validate(createBranchSchema), branchController.createBranch);
router.get('/list', authorize(['branch.view', 'employee.create', 'employee.edit']), branchController.getBranches);
router.get('/detail/:id', authorize('branch.view'), branchController.getBranchById);
router.put('/update/:id', authorize('branch.edit'), validate(updateBranchSchema), branchController.updateBranch);
router.delete('/delete/:id', authorize('branch.delete'), branchController.deleteBranch);

// Backwards compatibility / REST endpoints
router.post('/', authorize('branch.create'), validate(createBranchSchema), branchController.createBranch);
router.get('/', authorize(['branch.view', 'employee.create', 'employee.edit']), branchController.getBranches);
router.get('/:id', authorize('branch.view'), branchController.getBranchById);
router.put('/:id', authorize('branch.edit'), validate(updateBranchSchema), branchController.updateBranch);
router.delete('/:id', authorize('branch.delete'), branchController.deleteBranch);

export default router;
