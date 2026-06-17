/**
 * Super Admin Routes
 * Sirf Super Admin access kar sakta hai
 */

import { Router }          from 'express';
import { authenticate }    from '../middlewares/auth.middleware.js';
import { superAdminOnly }  from '../middlewares/superAdmin.middleware.js';
import * as superAdminController from '../controllers/superAdmin.controller.js';
import { validate }        from '../middlewares/validate.middleware.js';
import { onboardCompanySchema, superAdminUpdateCompanySchema } from '../validators/company.validator.js';

const router = Router();

// Sab routes pe authenticate + superAdminOnly
router.use(authenticate, superAdminOnly);

// ─── Platform Stats ─────────────────────────────────────────────
router.get('/stats', superAdminController.getPlatformStats);

// ─── Companies ──────────────────────────────────────────────────
router.get('/companies',              superAdminController.getAllCompanies);
router.post('/companies',             validate(onboardCompanySchema), superAdminController.createCompany);
router.get('/companies/:id',          superAdminController.getCompanyById);
router.patch('/companies/:id/subscription', validate(superAdminUpdateCompanySchema), superAdminController.updateCompanySubscription);
router.get('/companies/:id/users',    superAdminController.getCompanyUsers);
router.get('/companies/:id/roles',    superAdminController.getCompanyRoles);

export default router;
