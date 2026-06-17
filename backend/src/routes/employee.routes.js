import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validator.js';

const router = Router();

// Secure all employee routes with authentication
router.use(authenticate);

// Explicit, clear action-based endpoints
router.post('/create', authorize('employee.create'), validate(createUserSchema), employeeController.createEmployee);
router.get('/list', authorize('employee.view'), employeeController.getEmployees);
router.get('/profile/:id', authorize('employee.view'), employeeController.getEmployeeProfile);
router.put('/update/:id', authorize('employee.edit'), validate(updateUserSchema), employeeController.updateEmployee);
router.delete('/delete/:id', authorize('employee.delete'), employeeController.deleteEmployee);
router.post('/terminate/:id', authorize('employee.delete'), employeeController.terminateEmployee); // Uses employee.delete or a custom permission

export default router;
