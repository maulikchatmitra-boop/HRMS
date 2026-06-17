import { Router } from 'express';
import * as auditLogController from '../controllers/audit-log.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';

const router = Router();

// Retrieve audit logs for the company
router.get('/', authenticate, authorize('audit.view'), auditLogController.getAuditLogs);

export default router;
