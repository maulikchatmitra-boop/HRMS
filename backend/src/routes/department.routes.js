import { Router } from 'express';
import * as departmentController from '../controllers/department.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/department.validator.js';

const router = Router();

router.use(authenticate);

// Explicit Action-based endpoints
router.post('/create', authorize('department.create'), validate(createDepartmentSchema), departmentController.createDepartment);
router.get('/list', authorize(['department.view', 'employee.create', 'employee.edit']), departmentController.getDepartments);
router.get('/detail/:id', authorize('department.view'), departmentController.getDepartmentById);
router.put('/update/:id', authorize('department.edit'), validate(updateDepartmentSchema), departmentController.updateDepartment);
router.delete('/delete/:id', authorize('department.delete'), departmentController.deleteDepartment);

// Backwards compatibility / REST endpoints
router.post('/', authorize('department.create'), validate(createDepartmentSchema), departmentController.createDepartment);
router.get('/', authorize(['department.view', 'employee.create', 'employee.edit']), departmentController.getDepartments);
router.get('/:id', authorize('department.view'), departmentController.getDepartmentById);
router.put('/:id', authorize('department.edit'), validate(updateDepartmentSchema), departmentController.updateDepartment);
router.delete('/:id', authorize('department.delete'), departmentController.deleteDepartment);

export default router;
