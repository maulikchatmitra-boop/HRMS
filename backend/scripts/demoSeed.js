import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import Company from '../src/models/company.model.js';
import User from '../src/models/user.model.js';
import Role from '../src/models/role.model.js';
import Permission from '../src/models/permission.model.js';
import RolePermission from '../src/models/role-permission.model.js';
import Branch from '../src/models/branch.model.js';
import Department from '../src/models/department.model.js';
import Designation from '../src/models/designation.model.js';
import Shift from '../src/models/shift.model.js';
import { hashPassword } from '../src/utils/auth.utils.js';

dotenv.config();

const demoSeed = async () => {
  try {
    await connectDatabase();
    console.log('──────────────────────────────────────────────────');
    console.log('  Seeding Clean Demo Company & Multi-Role Accounts');
    console.log('──────────────────────────────────────────────────');

    // 1. Check if DEMO company code already exists
    let company = await Company.findOne({ companyCode: 'DEMO' });
    if (company) {
      console.log('Company DEMO already exists. Cleaning its existing users/roles...');
      await User.deleteMany({ companyId: company._id });
      await Role.deleteMany({ companyId: company._id });
      await RolePermission.deleteMany({ companyId: company._id });
      await Branch.deleteMany({ companyId: company._id });
      await Department.deleteMany({ companyId: company._id });
      await Designation.deleteMany({ companyId: company._id });
      await Shift.deleteMany({ companyId: company._id });
    } else {
      company = new Company({
        companyName: 'Demo Industries Ltd',
        companyCode: 'DEMO',
        email: 'billing@demo.com',
        phone: '9876543210',
        status: 'active',
        subscriptionStatus: 'active',
        plan: 'enterprise',
      });
      await company.save();
      console.log('✅ Company "Demo Industries Ltd" (DEMO) created.');
    }

    const companyId = company._id;

    // 2. Pre-generate IDs
    const creatorId = new mongoose.Types.ObjectId(); // temporary ID to break cycle

    // 3. Create Branches, Departments, Designations, Shifts
    const branch = new Branch({
      companyId,
      name: 'Mumbai HQ',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await branch.save();
    console.log('✅ Branch "Mumbai HQ" created.');

    const deptEng = new Department({
      companyId,
      name: 'Engineering',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await deptEng.save();
    const deptHR = new Department({
      companyId,
      name: 'Human Resources',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await deptHR.save();
    console.log('✅ Departments "Engineering" and "Human Resources" created.');

    const desigEng = new Designation({
      companyId,
      title: 'Senior Developer',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await desigEng.save();
    const desigHR = new Designation({
      companyId,
      title: 'HR Manager',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await desigHR.save();
    console.log('✅ Designations "Senior Developer" and "HR Manager" created.');

    const shift = new Shift({
      companyId,
      name: 'Regular General Shift',
      startTime: '09:00',
      endTime: '18:00',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await shift.save();
    console.log('✅ Shift "Regular General Shift" created.');

    // 4. Create Roles
    const roleAdmin = new Role({
      companyId,
      roleName: 'Company Admin',
      description: 'Administrative access to all records and settings.',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await roleAdmin.save();

    const roleHR = new Role({
      companyId,
      roleName: 'HR',
      description: 'Manage employee database, departments, designations.',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await roleHR.save();

    const roleManager = new Role({
      companyId,
      roleName: 'Manager',
      description: 'Manage team and view assignments.',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await roleManager.save();

    const roleEmployee = new Role({
      companyId,
      roleName: 'Employee',
      description: 'Standard view-only portal access.',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await roleEmployee.save();

    console.log('✅ Roles "Company Admin", "HR", "Manager", "Employee" created.');

    // 5. Seed Permissions
    const permissions = await Permission.find({});
    if (permissions.length === 0) {
      throw new Error('No global permissions found. Make sure permissions are seeded first.');
    }

    const rolePermissionMappings = [];

    const addMapping = (roleId, permissionKey) => {
      const perm = permissions.find(p => p.permissionKey === permissionKey);
      if (perm) {
        rolePermissionMappings.push({
          companyId,
          roleId,
          permissionId: perm._id,
          createdBy: creatorId,
          updatedBy: creatorId
        });
      }
    };

    permissions.forEach(perm => {
      const key = perm.permissionKey;

      // Admin -> All
      addMapping(roleAdmin._id, key);

      // HR -> employee.*, role.view, audit.view, company.view, department.*, designation.*, branch.*, shift.*, holiday.*
      if (
        key.startsWith('employee.') ||
        key === 'role.view' ||
        key === 'audit.view' ||
        key === 'company.view' ||
        key.startsWith('department.') ||
        key.startsWith('designation.') ||
        key.startsWith('branch.') ||
        key.startsWith('shift.') ||
        key.startsWith('holiday.')
      ) {
        addMapping(roleHR._id, key);
      }

      // Manager -> employee.view, company.view, department.view, designation.view, branch.view, shift.view, holiday.view
      if (
        key === 'employee.view' ||
        key === 'company.view' ||
        key === 'department.view' ||
        key === 'designation.view' ||
        key === 'branch.view' ||
        key === 'shift.view' ||
        key === 'holiday.view'
      ) {
        addMapping(roleManager._id, key);
      }

      // Employee -> company.view, holiday.view
      if (key === 'company.view' || key === 'holiday.view') {
        addMapping(roleEmployee._id, key);
      }
    });

    if (rolePermissionMappings.length > 0) {
      await RolePermission.insertMany(rolePermissionMappings);
      console.log(`✅ Seeded ${rolePermissionMappings.length} Role-Permission Mappings.`);
    }

    // 6. Create Users
    const pwdAdmin = await hashPassword('AdminPassword@123');
    const pwdHR = await hashPassword('HRPassword@123');
    const pwdManager = await hashPassword('ManagerPassword@123');
    const pwdEmployee = await hashPassword('EmployeePassword@123');

    const userAdmin = new User({
      companyId,
      firstName: 'Admin',
      lastName: 'Owner',
      email: 'admin@demo.com',
      password: pwdAdmin,
      roleId: roleAdmin._id,
      departmentId: deptEng._id,
      designationId: desigEng._id,
      branchId: branch._id,
      shiftId: shift._id,
      status: 'active',
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await userAdmin.save();

    const userHR = new User({
      companyId,
      firstName: 'HR',
      lastName: 'Manager',
      email: 'hr@demo.com',
      password: pwdHR,
      roleId: roleHR._id,
      departmentId: deptHR._id,
      designationId: desigHR._id,
      branchId: branch._id,
      shiftId: shift._id,
      status: 'active',
      createdBy: userAdmin._id,
      updatedBy: userAdmin._id,
    });
    await userHR.save();

    const userManager = new User({
      companyId,
      firstName: 'Team',
      lastName: 'Manager',
      email: 'manager@demo.com',
      password: pwdManager,
      roleId: roleManager._id,
      departmentId: deptEng._id,
      designationId: desigEng._id,
      branchId: branch._id,
      shiftId: shift._id,
      status: 'active',
      createdBy: userAdmin._id,
      updatedBy: userAdmin._id,
    });
    await userManager.save();

    const userEmployee = new User({
      companyId,
      firstName: 'Staff',
      lastName: 'Employee',
      email: 'employee@demo.com',
      password: pwdEmployee,
      roleId: roleEmployee._id,
      departmentId: deptEng._id,
      designationId: desigEng._id,
      branchId: branch._id,
      shiftId: shift._id,
      status: 'active',
      reportingManagerId: userManager._id,
      createdBy: userAdmin._id,
      updatedBy: userAdmin._id,
    });
    await userEmployee.save();

    // Fix circular creator references
    await mongoose.connection.db.collection('branches').updateMany({}, { $set: { createdBy: userAdmin._id, updatedBy: userAdmin._id } });
    await mongoose.connection.db.collection('departments').updateMany({}, { $set: { createdBy: userAdmin._id, updatedBy: userAdmin._id } });
    await mongoose.connection.db.collection('designations').updateMany({}, { $set: { createdBy: userAdmin._id, updatedBy: userAdmin._id } });
    await mongoose.connection.db.collection('shifts').updateMany({}, { $set: { createdBy: userAdmin._id, updatedBy: userAdmin._id } });
    await mongoose.connection.db.collection('roles').updateMany({}, { $set: { createdBy: userAdmin._id, updatedBy: userAdmin._id } });
    await mongoose.connection.db.collection('role_permissions').updateMany({}, { $set: { createdBy: userAdmin._id, updatedBy: userAdmin._id } });
    await mongoose.connection.db.collection('users').updateOne({ _id: userAdmin._id }, { $set: { createdBy: userAdmin._id, updatedBy: userAdmin._id } });

    console.log('✅ All 4 demo users seeded successfully.');
    console.log('──────────────────────────────────────────────────');
    console.log('  Demo Company Seed Complete!');
    console.log('──────────────────────────────────────────────────');
    console.log('  Company Code: DEMO');
    console.log('  1. Company Admin: admin@demo.com  / AdminPassword@123');
    console.log('  2. HR Manager   : hr@demo.com     / HRPassword@123');
    console.log('  3. Team Manager : manager@demo.com/ ManagerPassword@123');
    console.log('  4. Employee     : employee@demo.com/EmployeePassword@123');
    console.log('──────────────────────────────────────────────────');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

demoSeed();
