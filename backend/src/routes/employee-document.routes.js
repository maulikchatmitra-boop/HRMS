import { Router } from 'express';
import * as docController from '../controllers/employee-document.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import upload from '../middlewares/upload.middleware.js';

const router = Router();

// Dashboard general endpoints
router.get('/dashboard', authenticate, authorize('document.view'), docController.getDashboardDocuments);
router.get('/summary',   authenticate, authorize('document.view'), docController.getDashboardSummary);

// Actions
router.post('/upload',                       authenticate, authorize('document.upload'), upload.single('file'), docController.uploadDocument);
router.post('/:employeeId/documents',        authenticate, authorize('document.upload'), upload.single('file'), docController.uploadDocument);
router.get('/:documentId/download',          authenticate, authorize('document.download'), docController.downloadDocument);
router.patch('/:documentId/verify',          authenticate, authorize('document.verify'), docController.verifyDocument);
router.patch('/:documentId/acknowledge',     authenticate, authorize('document.view'), docController.acknowledgeDocument);
router.delete('/:documentId',                authenticate, authorize('document.delete'), docController.deleteDocument);

export default router;
