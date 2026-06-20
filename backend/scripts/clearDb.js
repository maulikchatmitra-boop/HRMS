import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import Permission from '../src/models/permission.model.js';
import User from '../src/models/user.model.js';
import { hashPassword } from '../src/utils/auth.utils.js';

dotenv.config();

const permissionsToSeed = [
  // Employee module permissions
  { module: 'employee', action: 'create', permissionKey: 'employee.create' },
  { module: 'employee', action: 'view',   permissionKey: 'employee.view' },
  { module: 'employee', action: 'edit',   permissionKey: 'employee.edit' },
  { module: 'employee', action: 'delete', permissionKey: 'employee.delete' },

  // Role module permissions

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



  // Holiday Calendar permissions
  { module: 'holiday', action: 'create', permissionKey: 'holiday.create' },
  { module: 'holiday', action: 'view',   permissionKey: 'holiday.view' },
  { module: 'holiday', action: 'edit',   permissionKey: 'holiday.edit' },
  { module: 'holiday', action: 'delete', permissionKey: 'holiday.delete' }
];

const clearDb = async () => {
  try {
    console.log('=== Clearing Database to Clean Platform State ===');
    await connectDatabase();

    console.log('Dropping existing database...');
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped successfully.');

    console.log('Seeding global system permissions...');
    const createdPermissions = await Permission.insertMany(permissionsToSeed);
    console.log(`Successfully seeded ${createdPermissions.length} permissions.`);

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

    console.log('\n🚀 DATABASE CLEARED SUCCESSFULLY! Only Super Admin and system permissions exist.');
  } catch (error) {
    console.error('❌ Error during clear DB process:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

clearDb();
