import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import Company from '../src/models/company.model.js';
import Role from '../src/models/role.model.js';
import Permission from '../src/models/permission.model.js';
import RolePermission from '../src/models/role-permission.model.js';

dotenv.config();

const migrate = async () => {
  try {
    console.log('Starting migration to map new permissions to existing company roles...');
    await connectDatabase();

    const companies = await Company.find({});
    console.log(`Found ${companies.length} companies in the database.`);

    const permissions = await Permission.find({});
    console.log(`Found ${permissions.length} total permissions in the system.`);

    let createdCount = 0;

    for (const company of companies) {
      console.log(`Migrating roles for company: ${company.companyName} (${company.companyCode})...`);

      const roles = await Role.find({ companyId: company._id });
      console.log(`  - Found ${roles.length} roles.`);

      for (const role of roles) {
        console.log(`    - Processing role: ${role.roleName}...`);
        
        // Define which permission keys this role is eligible for
        const eligibleKeys = [];

        permissions.forEach(perm => {
          const key = perm.permissionKey;

          if (role.roleName === 'Company Admin') {
            eligibleKeys.push(key);
          } else if (role.roleName === 'HR') {
            if (
              key.startsWith('employee.') ||
              key === 'role.view' ||
              key === 'audit.view' ||
              key === 'company.view' ||
              key.startsWith('department.') ||
              key.startsWith('designation.') ||
              key.startsWith('branch.') ||
              key.startsWith('shift.') ||
              key.startsWith('employeeType.') ||
              key.startsWith('workLocation.') ||
              key.startsWith('holiday.')
            ) {
              eligibleKeys.push(key);
            }
          } else if (role.roleName === 'Manager') {
            if (
              key === 'employee.view' ||
              key === 'company.view' ||
              key === 'department.view' ||
              key === 'designation.view' ||
              key === 'branch.view' ||
              key === 'shift.view' ||
              key === 'employeeType.view' ||
              key === 'workLocation.view' ||
              key === 'holiday.view'
            ) {
              eligibleKeys.push(key);
            }
          } else if (role.roleName === 'Employee') {
            if (key === 'company.view' || key === 'holiday.view') {
              eligibleKeys.push(key);
            }
          }
        });

        // Insert missing mappings
        for (const key of eligibleKeys) {
          const permDoc = permissions.find(p => p.permissionKey === key);
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
            createdCount++;
          }
        }
      }
    }

    console.log('----------------------------------------------------');
    console.log(`Migration complete. Created ${createdCount} new role-permission mapping entries.`);
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('Migration encountered an error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

migrate();
