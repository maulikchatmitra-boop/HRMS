import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';

// Explicitly import models to register their schemas in mongoose
import Permission from '../src/models/permission.model.js';
import Role from '../src/models/role.model.js';
import RolePermission from '../src/models/role-permission.model.js';

dotenv.config();

const documentPermissions = [
  { module: 'document', action: 'view',     permissionKey: 'document.view',     description: 'View own/assigned documents' },
  { module: 'document', action: 'upload',   permissionKey: 'document.upload',   description: 'Upload employee documents' },
  { module: 'document', action: 'delete',   permissionKey: 'document.delete',   description: 'Delete employee documents' },
  { module: 'document', action: 'download', permissionKey: 'document.download', description: 'Download employee documents' },
  { module: 'document', action: 'verify',   permissionKey: 'document.verify',   description: 'Verify/Approve employee documents' },
];

async function run() {
  try {
    await connectDatabase();
    console.log('--- Seeding Document Permissions ---');
    
    // 1. Seed Permissions
    const seededPerms = [];
    for (const perm of documentPermissions) {
      let existing = await Permission.findOne({ permissionKey: perm.permissionKey });
      if (!existing) {
        existing = await Permission.create(perm);
        console.log(`+ Created Permission: ${perm.permissionKey}`);
      } else {
        console.log(`= Permission Exists: ${perm.permissionKey}`);
      }
      seededPerms.push(existing);
    }

    // Map permissions by key for reference
    const permMap = seededPerms.reduce((acc, p) => {
      acc[p.permissionKey] = p._id;
      return acc;
    }, {});

    // 2. Map Permissions to existing Company Roles
    const rolesList = await Role.find({});
    console.log(`\nFound ${rolesList.length} roles in database. Mapping permissions...`);
    let createdMappings = 0;

    for (const role of rolesList) {
      const roleName = role.roleName.toUpperCase();
      let targetPermKeys = [];
      if (roleName.includes('HR') || roleName.includes('ADMIN')) {
        // HR / Admin gets all document permissions
        targetPermKeys = ['document.view', 'document.upload', 'document.delete', 'document.download', 'document.verify'];
      } else if (roleName.includes('EMPLOYEE')) {
        // Employee gets read/download permissions
        targetPermKeys = ['document.view', 'document.download'];
      } else if (roleName.includes('MANAGER')) {
        // Manager gets read/download permissions
        targetPermKeys = ['document.view', 'document.download'];
      }

      for (const key of targetPermKeys) {
        const permId = permMap[key];
        if (!permId) continue;
        try {
          const mappingExists = await RolePermission.findOne({
            companyId: role.companyId,
            roleId: role._id,
            permissionId: permId,
          });
          if (!mappingExists) {
            await RolePermission.create({
              companyId: role.companyId,
              roleId: role._id,
              permissionId: permId,
              createdBy: new mongoose.Types.ObjectId('000000000000000000000000'), // System user placeholder
              updatedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
            });
            createdMappings++;
          }
        } catch (mapErr) {
          // Ignore duplicate compound index errors
        }
      }
    }
    console.log(`\nMapping Setup Complete! Created ${createdMappings} new role-permission connections.`);
  } catch (err) {
    console.error('Database setup failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

run();
