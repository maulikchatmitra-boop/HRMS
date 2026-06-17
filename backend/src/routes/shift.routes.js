import { Router } from 'express';
import * as shiftController from '../controllers/shift.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createShiftSchema, updateShiftSchema } from '../validators/shift.validator.js';

const router = Router();

router.use(authenticate);

// Explicit Action-based endpoints
router.post('/create', authorize('shift.create'), validate(createShiftSchema), shiftController.createShift);
router.get('/list', authorize(['shift.view', 'employee.create', 'employee.edit']), shiftController.getShifts);
router.get('/detail/:id', authorize('shift.view'), shiftController.getShiftById);
router.put('/update/:id', authorize('shift.edit'), validate(updateShiftSchema), shiftController.updateShift);
router.delete('/delete/:id', authorize('shift.delete'), shiftController.deleteShift);

// Backwards compatibility / REST endpoints
router.post('/', authorize('shift.create'), validate(createShiftSchema), shiftController.createShift);
router.get('/', authorize(['shift.view', 'employee.create', 'employee.edit']), shiftController.getShifts);
router.get('/:id', authorize('shift.view'), shiftController.getShiftById);
router.put('/:id', authorize('shift.edit'), validate(updateShiftSchema), shiftController.updateShift);
router.delete('/:id', authorize('shift.delete'), shiftController.deleteShift);

export default router;
