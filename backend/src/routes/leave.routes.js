import { Router } from 'express';
import * as typeController from '../controllers/leave-type.controller.js';
import * as policyController from '../controllers/leave-policy.controller.js';
import * as balanceController from '../controllers/leave-balance.controller.js';
import * as requestController from '../controllers/leave-request.controller.js';
import * as calendarController from '../controllers/leave-calendar.controller.js';
import * as notificationController from '../controllers/leave-notification.controller.js';

import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

import { createLeaveTypeSchema, updateLeaveTypeSchema } from '../validators/leave-type.validator.js';
import { createLeavePolicySchema, updateLeavePolicySchema, assignLeavePolicySchema } from '../validators/leave-policy.validator.js';
import { adjustBalanceSchema } from '../validators/leave-balance.validator.js';
import { createLeaveRequestSchema, handleLeaveActionSchema } from '../validators/leave-request.validator.js';

const router = Router();

// Apply authenticate middleware to all leave routes
router.use(authenticate);

// ─── Leave Types ──────────────────────────────────────────────────
router.post(
  '/types',
  authorize('leaveType.create'),
  validate(createLeaveTypeSchema),
  typeController.createLeaveType
);
router.get(
  '/types',
  authorize(['leaveType.view', 'leave.apply']),
  typeController.getLeaveTypes
);
router.get(
  '/types/:id',
  authorize(['leaveType.view', 'leave.apply']),
  typeController.getLeaveTypeById
);
router.put(
  '/types/:id',
  authorize('leaveType.edit'),
  validate(updateLeaveTypeSchema),
  typeController.updateLeaveType
);
router.delete(
  '/types/:id',
  authorize('leaveType.delete'),
  typeController.deleteLeaveType
);

// ─── Leave Policies ───────────────────────────────────────────────
router.post(
  '/policies',
  authorize('leavePolicy.create'),
  validate(createLeavePolicySchema),
  policyController.createLeavePolicy
);
router.get(
  '/policies',
  authorize('leavePolicy.view'),
  policyController.getLeavePolicies
);
router.get(
  '/policies/:id',
  authorize('leavePolicy.view'),
  policyController.getLeavePolicyById
);
router.put(
  '/policies/:id',
  authorize('leavePolicy.edit'),
  validate(updateLeavePolicySchema),
  policyController.updateLeavePolicy
);
router.post(
  '/policies/:id/assign',
  authorize('leavePolicy.edit'),
  validate(assignLeavePolicySchema),
  policyController.assignLeavePolicy
);
router.delete(
  '/policies/:id',
  authorize('leavePolicy.delete'),
  policyController.deleteLeavePolicy
);

// ─── Leave Balances ───────────────────────────────────────────────
router.get(
  '/balances',
  authorize('leaveBalance.view'),
  balanceController.getLeaveBalances
);
router.put(
  '/balances/adjust',
  authorize('leaveBalance.manage'),
  validate(adjustBalanceSchema),
  balanceController.adjustLeaveBalance
);

// ─── Leave Requests ───────────────────────────────────────────────
router.post(
  '/requests',
  authorize('leave.apply'),
  validate(createLeaveRequestSchema),
  requestController.createLeaveRequest
);
router.get(
  '/requests',
  authorize(['leave.viewOwn', 'leave.viewAll']),
  requestController.getLeaveRequests
);
router.get(
  '/requests/:id',
  authorize(['leave.viewOwn', 'leave.viewAll']),
  requestController.getLeaveRequestById
);
router.put(
  '/requests/:id/action',
  authorize(['leave.approve', 'leave.reject', 'leave.sendBack', 'leave.cancel']),
  validate(handleLeaveActionSchema),
  requestController.handleLeaveAction
);

// ─── Leave Calendar ───────────────────────────────────────────────
router.get(
  '/calendar',
  authorize('leaveCalendar.view'),
  calendarController.getLeaveCalendar
);

// ─── Notifications ────────────────────────────────────────────────
router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/:id/read', notificationController.markAsRead);
router.delete('/notifications', notificationController.clearAll);

export default router;
