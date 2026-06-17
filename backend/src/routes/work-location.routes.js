import { Router } from 'express';
import * as workLocationController from '../controllers/work-location.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createWorkLocationSchema, updateWorkLocationSchema } from '../validators/work-location.validator.js';

const router = Router();

router.use(authenticate);

// Explicit Action-based endpoints
router.post('/create', authorize('workLocation.create'), validate(createWorkLocationSchema), workLocationController.createWorkLocation);
router.get('/list', authorize('workLocation.view'), workLocationController.getWorkLocations);
router.get('/detail/:id', authorize('workLocation.view'), workLocationController.getWorkLocationById);
router.put('/update/:id', authorize('workLocation.edit'), validate(updateWorkLocationSchema), workLocationController.updateWorkLocation);
router.delete('/delete/:id', authorize('workLocation.delete'), workLocationController.deleteWorkLocation);

// Backwards compatibility / REST endpoints
router.post('/', authorize('workLocation.create'), validate(createWorkLocationSchema), workLocationController.createWorkLocation);
router.get('/', authorize('workLocation.view'), workLocationController.getWorkLocations);
router.get('/:id', authorize('workLocation.view'), workLocationController.getWorkLocationById);
router.put('/:id', authorize('workLocation.edit'), validate(updateWorkLocationSchema), workLocationController.updateWorkLocation);
router.delete('/:id', authorize('workLocation.delete'), workLocationController.deleteWorkLocation);

export default router;
