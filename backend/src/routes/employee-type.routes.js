import { Router } from 'express';
import * as employeeTypeController from '../controllers/employee-type.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createEmployeeTypeSchema, updateEmployeeTypeSchema } from '../validators/employee-type.validator.js';

const router = Router();

router.use(authenticate);

// Explicit Action-based endpoints
router.post('/create', authorize('employeeType.create'), validate(createEmployeeTypeSchema), employeeTypeController.createEmployeeType);
router.get('/list', authorize('employeeType.view'), employeeTypeController.getEmployeeTypes);
router.get('/detail/:id', authorize('employeeType.view'), employeeTypeController.getEmployeeTypeById);
router.put('/update/:id', authorize('employeeType.edit'), validate(updateEmployeeTypeSchema), employeeTypeController.updateEmployeeType);
router.delete('/delete/:id', authorize('employeeType.delete'), employeeTypeController.deleteEmployeeType);

// Backwards compatibility / REST endpoints
router.post('/', authorize('employeeType.create'), validate(createEmployeeTypeSchema), employeeTypeController.createEmployeeType);
router.get('/', authorize('employeeType.view'), employeeTypeController.getEmployeeTypes);
router.get('/:id', authorize('employeeType.view'), employeeTypeController.getEmployeeTypeById);
router.put('/:id', authorize('employeeType.edit'), validate(updateEmployeeTypeSchema), employeeTypeController.updateEmployeeType);
router.delete('/:id', authorize('employeeType.delete'), employeeTypeController.deleteEmployeeType);

export default router;
