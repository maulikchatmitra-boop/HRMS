import { Router } from 'express';
import authRoutes       from './auth.routes.js';
import companyRoutes    from './company.routes.js';
import employeeRoutes from './employee.routes.js';
import roleRoutes       from './role.routes.js';
import permissionRoutes from './permission.routes.js';
import auditLogRoutes   from './audit-log.routes.js';
import superAdminRoutes from './superAdmin.routes.js';
import departmentRoutes from './department.routes.js';
import designationRoutes from './designation.routes.js';
import branchRoutes     from './branch.routes.js';
import shiftRoutes      from './shift.routes.js';
import employeeTypeRoutes from './employee-type.routes.js';
import workLocationRoutes from './work-location.routes.js';
import holidayCalendarRoutes from './holiday-calendar.routes.js';


const router = Router();

// API Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    success:   true,
    message:   'System is healthy.',
    timestamp: new Date()
  });
});

// ─── Public + Company Routes ─────────────────────────────────────
router.use('/auth',            authRoutes);
router.use('/companies',       companyRoutes);
router.use('/employees',       employeeRoutes);
router.use('/roles',           roleRoutes);
router.use('/permissions',     permissionRoutes);
router.use('/audit-logs',      auditLogRoutes);
router.use('/departments',     departmentRoutes);
router.use('/designations',    designationRoutes);
router.use('/branches',        branchRoutes);
router.use('/shifts',          shiftRoutes);
router.use('/employee-types',  employeeTypeRoutes);
router.use('/work-locations',  workLocationRoutes);
router.use('/holidays',        holidayCalendarRoutes);


// ─── Super Admin Routes ──────────────────────────────────────────
router.use('/super-admin', superAdminRoutes);

export default router;
