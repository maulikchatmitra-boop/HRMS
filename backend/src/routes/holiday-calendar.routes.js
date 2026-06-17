import { Router } from 'express';
import * as holidayCalendarController from '../controllers/holiday-calendar.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createHolidaySchema, updateHolidaySchema } from '../validators/holiday-calendar.validator.js';

const router = Router();

router.use(authenticate);

// Explicit Action-based endpoints
router.post('/create', authorize('holiday.create'), validate(createHolidaySchema), holidayCalendarController.createHoliday);
router.get('/list', authorize('holiday.view'), holidayCalendarController.getHolidays);
router.get('/detail/:id', authorize('holiday.view'), holidayCalendarController.getHolidayById);
router.put('/update/:id', authorize('holiday.edit'), validate(updateHolidaySchema), holidayCalendarController.updateHoliday);
router.delete('/delete/:id', authorize('holiday.delete'), holidayCalendarController.deleteHoliday);

// Backwards compatibility / REST endpoints
router.post('/', authorize('holiday.create'), validate(createHolidaySchema), holidayCalendarController.createHoliday);
router.get('/', authorize('holiday.view'), holidayCalendarController.getHolidays);
router.get('/:id', authorize('holiday.view'), holidayCalendarController.getHolidayById);
router.put('/:id', authorize('holiday.edit'), validate(updateHolidaySchema), holidayCalendarController.updateHoliday);
router.delete('/:id', authorize('holiday.delete'), holidayCalendarController.deleteHoliday);

export default router;
