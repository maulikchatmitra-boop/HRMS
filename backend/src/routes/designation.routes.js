import { Router } from 'express';
import * as designationController from '../controllers/designation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createDesignationSchema, updateDesignationSchema } from '../validators/designation.validator.js';

const router = Router();

router.use(authenticate);

// Explicit Action-based endpoints
router.post('/create', authorize('designation.create'), validate(createDesignationSchema), designationController.createDesignation);
router.get('/list', authorize(['designation.view', 'employee.create', 'employee.edit']), designationController.getDesignations);
router.get('/detail/:id', authorize('designation.view'), designationController.getDesignationById);
router.put('/update/:id', authorize('designation.edit'), validate(updateDesignationSchema), designationController.updateDesignation);
router.delete('/delete/:id', authorize('designation.delete'), designationController.deleteDesignation);

// Backwards compatibility / REST endpoints
router.post('/', authorize('designation.create'), validate(createDesignationSchema), designationController.createDesignation);
router.get('/', authorize(['designation.view', 'employee.create', 'employee.edit']), designationController.getDesignations);
router.get('/:id', authorize('designation.view'), designationController.getDesignationById);
router.put('/:id', authorize('designation.edit'), validate(updateDesignationSchema), designationController.updateDesignation);
router.delete('/:id', authorize('designation.delete'), designationController.deleteDesignation);

export default router;
