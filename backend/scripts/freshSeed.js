import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import Permission from '../src/models/permission.model.js';
import Company from '../src/models/company.model.js';
import User from '../src/models/user.model.js';
import Role from '../src/models/role.model.js';
import RolePermission from '../src/models/role-permission.model.js';
import Department from '../src/models/department.model.js';
import Designation from '../src/models/designation.model.js';
import Branch from '../src/models/branch.model.js';
import Shift from '../src/models/shift.model.js';
import { onboardCompany } from '../src/services/company.service.js';
import { hashPassword } from '../src/utils/auth.utils.js';

dotenv.config();

const permissionsToSeed = [
  // Employee module permissions
  { module: 'employee', action: 'create', permissionKey: 'employee.create' },
  { module: 'employee', action: 'view',   permissionKey: 'employee.view' },
  { module: 'employee', action: 'edit',   permissionKey: 'employee.edit' },
  { module: 'employee', action: 'delete', permissionKey: 'employee.delete' },

  // Company module permissions
  { module: 'company',  action: 'view',   permissionKey: 'company.view' },
  { module: 'company',  action: 'edit',   permissionKey: 'company.edit' },

  // Role module permissions
  { module: 'role',     action: 'view',   permissionKey: 'role.view' },
  { module: 'role',     action: 'edit',   permissionKey: 'role.edit' },

  // Audit logs permissions
  { module: 'audit',    action: 'view',   permissionKey: 'audit.view' },

  // Department permissions
  { module: 'department', action: 'create', permissionKey: 'department.create' },
  { module: 'department', action: 'view',   permissionKey: 'department.view' },
  { module: 'department', action: 'edit',   permissionKey: 'department.edit' },
  { module: 'department', action: 'delete', permissionKey: 'department.delete' },

  // Designation permissions
  { module: 'designation', action: 'create', permissionKey: 'designation.create' },
  { module: 'designation', action: 'view',   permissionKey: 'designation.view' },
  { module: 'designation', action: 'edit',   permissionKey: 'designation.edit' },
  { module: 'designation', action: 'delete', permissionKey: 'designation.delete' },

  // Branch permissions
  { module: 'branch', action: 'create', permissionKey: 'branch.create' },
  { module: 'branch', action: 'view',   permissionKey: 'branch.view' },
  { module: 'branch', action: 'edit',   permissionKey: 'branch.edit' },
  { module: 'branch', action: 'delete', permissionKey: 'branch.delete' },

  // Shift permissions
  { module: 'shift', action: 'create', permissionKey: 'shift.create' },
  { module: 'shift', action: 'view',   permissionKey: 'shift.view' },
  { module: 'shift', action: 'edit',   permissionKey: 'shift.edit' },
  { module: 'shift', action: 'delete', permissionKey: 'shift.delete' },

  // Employee Type permissions
  { module: 'employeeType', action: 'create', permissionKey: 'employeeType.create' },
  { module: 'employeeType', action: 'view',   permissionKey: 'employeeType.view' },
  { module: 'employeeType', action: 'edit',   permissionKey: 'employeeType.edit' },
  { module: 'employeeType', action: 'delete', permissionKey: 'employeeType.delete' },

  // Work Location permissions
  { module: 'workLocation', action: 'create', permissionKey: 'workLocation.create' },
  { module: 'workLocation', action: 'view',   permissionKey: 'workLocation.view' },
  { module: 'workLocation', action: 'edit',   permissionKey: 'workLocation.edit' },
  { module: 'workLocation', action: 'delete', permissionKey: 'workLocation.delete' },

  // Holiday Calendar permissions
  { module: 'holiday', action: 'create', permissionKey: 'holiday.create' },
  { module: 'holiday', action: 'view',   permissionKey: 'holiday.view' },
  { module: 'holiday', action: 'edit',   permissionKey: 'holiday.edit' },
  { module: 'holiday', action: 'delete', permissionKey: 'holiday.delete' },

  // Leave Management permissions
  { module: 'leaveType', action: 'create', permissionKey: 'leaveType.create' },
  { module: 'leaveType', action: 'view',   permissionKey: 'leaveType.view' },
  { module: 'leaveType', action: 'edit',   permissionKey: 'leaveType.edit' },
  { module: 'leaveType', action: 'delete', permissionKey: 'leaveType.delete' },
  { module: 'leavePolicy', action: 'create', permissionKey: 'leavePolicy.create' },
  { module: 'leavePolicy', action: 'view',   permissionKey: 'leavePolicy.view' },
  { module: 'leavePolicy', action: 'edit',   permissionKey: 'leavePolicy.edit' },
  { module: 'leavePolicy', action: 'delete', permissionKey: 'leavePolicy.delete' },
  { module: 'leaveBalance', action: 'view',   permissionKey: 'leaveBalance.view' },
  { module: 'leaveBalance', action: 'manage', permissionKey: 'leaveBalance.manage' },
  { module: 'leave', action: 'apply',    permissionKey: 'leave.apply' },
  { module: 'leave', action: 'viewOwn',  permissionKey: 'leave.viewOwn' },
  { module: 'leave', action: 'viewAll',  permissionKey: 'leave.viewAll' },
  { module: 'leave', action: 'cancel',   permissionKey: 'leave.cancel' },
  { module: 'leave', action: 'approve',  permissionKey: 'leave.approve' },
  { module: 'leave', action: 'reject',   permissionKey: 'leave.reject' },
  { module: 'leave', action: 'sendBack', permissionKey: 'leave.sendBack' },
  { module: 'leaveCalendar', action: 'view', permissionKey: 'leaveCalendar.view' },
  { module: 'leaveHistory',  action: 'view', permissionKey: 'leaveHistory.view' }
];

const freshSeed = async () => {
  try {
    console.log('=== Starting Fresh Seed Process ===');
    await connectDatabase();

    // 1. Drop Database to clear all old records
    console.log('Dropping existing database for clean start...');
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped successfully.');

    // 2. Seed Permissions
    console.log('Seeding global system permissions...');
    const createdPermissions = await Permission.insertMany(permissionsToSeed);
    console.log(`Successfully seeded ${createdPermissions.length} permissions.`);

    // 3. Seed Super Admin
    console.log('Seeding Super Admin user...');
    const hashedSuperAdminPassword = await hashPassword('SuperAdmin@123');
    const superAdmin = new User({
      companyId: null,
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@hrms.com',
      password: hashedSuperAdminPassword,
      roleId: null,
      isSuperAdmin: true,
      status: 'active'
    });
    await superAdmin.save();
    console.log('Super Admin user created successfully.');

    // 4. Onboard fresh company (TATA Industries)
    console.log('Onboarding company: TATA Industries...');
    const companyPayload = {
      companyName: 'TATA Industries',
      companyCode: 'TATA',
      email: 'contact@tata.com',
      phone: '9876543210',
      status: 'active',
      subscriptionStatus: 'active',
      plan: 'enterprise'
    };
    const adminPayload = {
      firstName: 'Ratan',
      lastName: 'Tata',
      email: 'admin@tata.com',
      password: 'Admin@123'
    };

    const onboardResult = await onboardCompany(companyPayload, adminPayload, superAdmin._id);
    const companyId = onboardResult.company._id;
    console.log(`Company "TATA Industries" onboarded successfully. Admin: admin@tata.com`);

    // Manually create HR, Manager, and Employee roles as the onboarding flow only generates Company Admin
    console.log('Creating HR, Manager, and Employee roles...');
    const hrRole = new Role({
      companyId,
      roleName: 'HR',
      description: 'Human Resources Management.',
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    });
    await hrRole.save();

    const managerRole = new Role({
      companyId,
      roleName: 'Manager',
      description: 'Team and shift management.',
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    });
    await managerRole.save();

    const employeeRole = new Role({
      companyId,
      roleName: 'Employee',
      description: 'Regular Employee access.',
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    });
    await employeeRole.save();

    // Map all permissions to HR for testing
    const hrPermissionMappings = createdPermissions.map(perm => ({
      companyId,
      roleId: hrRole._id,
      permissionId: perm._id,
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    }));
    await RolePermission.insertMany(hrPermissionMappings);

    // 5. Seed HR User
    console.log('Seeding HR User...');
    const hashedHRPassword = await hashPassword('HRUser@123');
    const hrUser = new User({
      companyId,
      firstName: 'Hormusji',
      lastName: 'HR',
      email: 'hr@tata.com',
      password: hashedHRPassword,
      roleId: hrRole._id,
      status: 'active',
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    });
    await hrUser.save();
    console.log('HR User created successfully.');

    // 6. Seed Manager User
    console.log('Seeding Manager User...');
    const hashedManagerPassword = await hashPassword('ManagerUser@123');
    const managerUser = new User({
      companyId,
      firstName: 'Jamsetji',
      lastName: 'Manager',
      email: 'manager@tata.com',
      password: hashedManagerPassword,
      roleId: managerRole._id,
      status: 'active',
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    });
    await managerUser.save();
    console.log('Manager User created successfully.');

    // 7. Seed Employee User
    console.log('Seeding Employee User...');
    const hashedEmployeePassword = await hashPassword('EmployeeUser@123');
    const employeeUser = new User({
      companyId,
      firstName: 'Dorabji',
      lastName: 'Employee',
      email: 'employee@tata.com',
      password: hashedEmployeePassword,
      roleId: employeeRole._id,
      status: 'active',
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    });
    await employeeUser.save();
    console.log('Employee User created successfully.');

    // 8. Create Custom Role (Operations Coordinator)
    console.log('Creating Custom Role: Operations Coordinator...');
    const customRoleId = new mongoose.Types.ObjectId();
    const customRole = new Role({
      _id: customRoleId,
      companyId,
      roleName: 'Operations Coordinator',
      description: 'Manage shifts and holidays, view company/employee lists.',
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    });
    await customRole.save();

    // Map permissions to Custom Role:
    // company.view, employee.view, holiday.view, holiday.create, holiday.edit, shift.view, shift.create
    const customPermissionKeys = [
      'company.view',
      'employee.view',
      'holiday.view',
      'holiday.create',
      'holiday.edit',
      'shift.view',
      'shift.create'
    ];

    const targetPermissions = await Permission.find({ permissionKey: { $in: customPermissionKeys } });
    const customMappings = targetPermissions.map(perm => ({
      companyId,
      roleId: customRoleId,
      permissionId: perm._id,
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    }));

    await RolePermission.insertMany(customMappings);
    console.log(`Custom role mappings created successfully with ${customMappings.length} permissions.`);

    // Seed Custom Role User
    console.log('Seeding Custom Role User (Operations Coordinator)...');
    const hashedCoordinatorPassword = await hashPassword('Coordinator@123');
    const coordinatorUser = new User({
      companyId,
      firstName: 'Jehangir',
      lastName: 'Coordinator',
      email: 'coordinator@tata.com',
      password: hashedCoordinatorPassword,
      roleId: customRoleId,
      status: 'active',
      createdBy: onboardResult.adminUser._id,
      updatedBy: onboardResult.adminUser._id
    });
    await coordinatorUser.save();
    console.log('Custom Role User created successfully.');

    console.log('\n========================================================================');
    console.log('🚀 CLEAN SEED COMPLETED SUCCESSFULLY!');
    console.log('========================================================================\n');
    console.log('Credentials for Testing:');
    console.log('------------------------------------------------------------------------');
    console.log('Role               | Email                  | Password      | Company Code');
    console.log('------------------------------------------------------------------------');
    console.log('Super Admin        | superadmin@hrms.com    | SuperAdmin@123| -');
    console.log('Company Admin      | admin@tata.com         | Admin@123     | TATA');
    console.log('HR                 | hr@tata.com            | HRUser@123    | TATA');
    console.log('Manager            | manager@tata.com       | ManagerUser@123| TATA');
    console.log('Employee           | employee@tata.com      | EmployeeUser@123| TATA');
    console.log('Custom Role (OpCo) | coordinator@tata.com   | Coordinator@123| TATA');
    console.log('------------------------------------------------------------------------\n');

  } catch (error) {
    console.error('❌ Error in freshSeed process:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

freshSeed();
