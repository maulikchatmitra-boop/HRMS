import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  regularizeSchema,
  approveRegularizationSchema,
  adminOverrideSchema,
} from '../validators/attendance.validator.js';

const router = Router();

router.use(authenticate);

router.post('/check-in', authorize('attendance.checkin'), attendanceController.checkIn);
router.post('/check-out', authorize('attendance.checkout'), attendanceController.checkOut);
router.post('/regularize', authorize('attendance.regularize'), validate(regularizeSchema), attendanceController.regularize);
router.post('/approve-regularization/:id', authorize('attendance.approve'), validate(approveRegularizationSchema), attendanceController.approveRegularization);
router.post('/override', authorize('attendance.manage'), validate(adminOverrideSchema), attendanceController.overrideAttendance);

router.get('/settings', authorize('attendance.view'), attendanceController.getSettings);
router.put('/settings', authorize('attendance.manage'), attendanceController.updateSettings);

router.get('/my-logs', authorize('attendance.view'), attendanceController.getMyLogs);
router.get('/team-logs', authorize('attendance.view'), attendanceController.getTeamLogs);
router.get('/monthly-summary', authorize('attendance.view'), attendanceController.getMonthlySummary);
router.get('/dashboard-metrics', authorize('attendance.view'), attendanceController.getDashboardMetrics);
router.get('/company-monthly-summary', authorize('attendance.manage'), attendanceController.getCompanyMonthlySummary);

export default router;
