import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import * as permissionService from '../src/services/permission.service.js';

// Load environment configurations
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
  { module: 'holiday', action: 'delete', permissionKey: 'holiday.delete' }
];

const seed = async () => {
  try {
    console.log('Starting bootstrap seeding process...');
    
    // 1. Establish DB Connection
    await connectDatabase();

    // 2. Bootstrap permissions
    console.log('Seeding global system permissions...');
    const result = await permissionService.bootstrapPermissions(permissionsToSeed);
    
    console.log('----------------------------------------------------');
    console.log(`Seeding complete:`);
    console.log(`- Inserted new permissions: ${result.insertedCount}`);
    console.log(`- Skipped existing permissions: ${result.skippedCount}`);
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('Seeding process encountered an error:', error);
  } finally {
    // 3. Disconnect Mongoose client
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

seed();
