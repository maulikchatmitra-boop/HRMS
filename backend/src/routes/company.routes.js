import { Router } from 'express';
import * as companyController from '../controllers/company.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateCompanySchema } from '../validators/company.validator.js';

const router = Router();

// Tenant-scoped metadata routes
router.get('/', authenticate, authorize('company.view'), companyController.getCompany);
router.put('/', authenticate, authorize('company.edit'), validate(updateCompanySchema), companyController.updateCompany);

export default router;
