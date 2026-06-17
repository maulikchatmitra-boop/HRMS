import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import Company from '../src/models/company.model.js';
import User from '../src/models/user.model.js';
import Role from '../src/models/role.model.js';
import RolePermission from '../src/models/role-permission.model.js';
import Branch from '../src/models/branch.model.js';
import Department from '../src/models/department.model.js';
import Designation from '../src/models/designation.model.js';
import EmployeeType from '../src/models/employee-type.model.js';
import HolidayCalendar from '../src/models/holiday-calendar.model.js';
import Shift from '../src/models/shift.model.js';
import WorkLocation from '../src/models/work-location.model.js';
import AuditLog from '../src/models/audit-log.model.js';

dotenv.config();

const cleanDb = async () => {
  try {
    await connectDatabase();
    console.log('──────────────────────────────────────────────────');
    console.log('  Cleaning HRMS Database (Keeping Super Admin & Permissions)');
    console.log('──────────────────────────────────────────────────');

    // Delete Company tenant records
    const resCompany = await Company.deleteMany({});
    console.log(`- Deleted ${resCompany.deletedCount} Companies`);

    // Delete non-super-admin Users
    const resUser = await User.deleteMany({ isSuperAdmin: { $ne: true } });
    console.log(`- Deleted ${resUser.deletedCount} Employees / Users`);

    // Delete Roles
    const resRole = await Role.deleteMany({});
    console.log(`- Deleted ${resRole.deletedCount} Roles`);

    // Delete Role-Permission Mappings
    const resRolePerm = await RolePermission.deleteMany({});
    console.log(`- Deleted ${resRolePerm.deletedCount} Role-Permission Mappings`);

    // Delete Branches
    const resBranch = await Branch.deleteMany({});
    console.log(`- Deleted ${resBranch.deletedCount} Branches`);

    // Delete Departments
    const resDept = await Department.deleteMany({});
    console.log(`- Deleted ${resDept.deletedCount} Departments`);

    // Delete Designations
    const resDesig = await Designation.deleteMany({});
    console.log(`- Deleted ${resDesig.deletedCount} Designations`);

    // Delete Employee Types
    const resEmpType = await EmployeeType.deleteMany({});
    console.log(`- Deleted ${resEmpType.deletedCount} Employee Types`);

    // Delete Holidays
    const resHoliday = await HolidayCalendar.deleteMany({});
    console.log(`- Deleted ${resHoliday.deletedCount} Holidays`);

    // Delete Shifts
    const resShift = await Shift.deleteMany({});
    console.log(`- Deleted ${resShift.deletedCount} Shifts`);

    // Delete Work Locations
    const resWorkLoc = await WorkLocation.deleteMany({});
    console.log(`- Deleted ${resWorkLoc.deletedCount} Work Locations`);

    // Delete Audit Logs
    const resAudit = await AuditLog.deleteMany({});
    console.log(`- Deleted ${resAudit.deletedCount} Audit Logs`);

    // Verify Super Admin still exists
    const adminUser = await User.findOne({ isSuperAdmin: true });
    if (!adminUser) {
      console.log('⚠️ Warning: No Super Admin user found in the database. Seeding a new one...');
      const { hashPassword } = await import('../src/utils/auth.utils.js');
      const hashedPassword = await hashPassword('SuperAdmin@123');
      const superAdmin = new User({
        companyId: null,
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@hrms.com',
        password: hashedPassword,
        roleId: null,
        isSuperAdmin: true,
        status: 'active',
      });
      await superAdmin.save();
      console.log('✅ Super Admin created successfully!');
      console.log('   Email   : superadmin@hrms.com');
      console.log('   Password: SuperAdmin@123');
    } else {
      console.log(`✅ Super Admin preserved: ${adminUser.email}`);
    }

    console.log('──────────────────────────────────────────────────');
    console.log('  Database clean complete!');
    console.log('──────────────────────────────────────────────────');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

cleanDb();
