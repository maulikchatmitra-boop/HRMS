import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import Company from '../src/models/company.model.js';
import Role from '../src/models/role.model.js';
import Permission from '../src/models/permission.model.js';
import RolePermission from '../src/models/role-permission.model.js';

dotenv.config();

const leavePermissions = [
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

const migrate = async () => {
  try {
    console.log('=== Starting Leave Permissions Migration ===');
    await connectDatabase();

    // 1. Seed Permissions
    console.log('Seeding leave module permissions...');
    const seededPermissions = [];
    for (const perm of leavePermissions) {
      let doc = await Permission.findOne({ permissionKey: perm.permissionKey });
      if (!doc) {
        doc = await Permission.create(perm);
        console.log(`Created Permission: ${perm.permissionKey}`);
      }
      seededPermissions.push(doc);
    }
    console.log(`Verified/Seeded ${seededPermissions.length} leave permissions.`);

    // 2. Fetch all companies
    const companies = await Company.find({});
    console.log(`Found ${companies.length} companies for role mapping.`);

    let createdMappings = 0;

    for (const company of companies) {
      console.log(`Mapping permissions for company: ${company.companyName} (${company.companyCode})`);

      const roles = await Role.find({ companyId: company._id });
      console.log(`  - Found ${roles.length} roles.`);

      for (const role of roles) {
        const roleName = role.roleName.toLowerCase();
        let eligibleKeys = [];

        // Determine which permissions this role should get
        if (roleName.includes('admin')) {
          // Admin gets everything
          eligibleKeys = leavePermissions.map(p => p.permissionKey);
        } else if (roleName.includes('hr')) {
          // HR gets everything
          eligibleKeys = leavePermissions.map(p => p.permissionKey);
        } else if (roleName.includes('manager') || roleName.includes('lead')) {
          // Manager gets:
          eligibleKeys = [
            'leaveType.view',
            'leavePolicy.view',
            'leaveBalance.view',
            'leave.apply',
            'leave.viewOwn',
            'leave.viewAll',
            'leave.cancel',
            'leave.approve',
            'leave.reject',
            'leave.sendBack',
            'leaveCalendar.view',
            'leaveHistory.view'
          ];
        } else if (roleName.includes('employee') || roleName.includes('staff')) {
          // Employee gets:
          eligibleKeys = [
            'leaveBalance.view',
            'leave.apply',
            'leave.viewOwn',
            'leave.cancel',
            'leaveCalendar.view'
          ];
        } else {
          // Custom roles: default to employee-level leave view/apply
          eligibleKeys = [
            'leaveBalance.view',
            'leave.apply',
            'leave.viewOwn',
            'leave.cancel',
            'leaveCalendar.view'
          ];
        }

        // Insert missing role-permission mappings
        for (const key of eligibleKeys) {
          const permDoc = seededPermissions.find(p => p.permissionKey === key);
          if (!permDoc) continue;

          const existingMapping = await RolePermission.findOne({
            companyId: company._id,
            roleId: role._id,
            permissionId: permDoc._id
          });

          if (!existingMapping) {
            await RolePermission.create({
              companyId: company._id,
              roleId: role._id,
              permissionId: permDoc._id,
              createdBy: role.createdBy,
              updatedBy: role.updatedBy
            });
            createdMappings++;
          }
        }
      }
    }

    console.log('----------------------------------------------------');
    console.log(`Migration complete. Created ${createdMappings} new role-permission mapping entries.`);
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

migrate();
