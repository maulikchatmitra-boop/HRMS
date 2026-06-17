import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import Role from '../src/models/role.model.js';
import RolePermission from '../src/models/role-permission.model.js';
import Permission from '../src/models/permission.model.js';
import Company from '../src/models/company.model.js';

dotenv.config();

const checkAllRolePermissions = async () => {
  try {
    await connectDatabase();

    // 1. Saari companies lo
    const companies = await Company.find({});
    
    if (companies.length === 0) {
      console.log('❌ Koi company nahi mili DB mein!');
      process.exit(0);
    }

    // 2. Har company ke roles check karo
    for (const company of companies) {
      console.log('\n' + '='.repeat(60));
      console.log(`🏢 Company: ${company.companyName} (${company.companyCode})`);
      console.log('='.repeat(60));

      // 3. Is company ke sare roles lo
      const roles = await Role.find({ companyId: company._id });

      if (roles.length === 0) {
        console.log('  ❌ Koi role nahi mila!');
        continue;
      }

      // 4. Har role ki permissions dekho
      for (const role of roles) {
        console.log(`\n  🛡️  Role: ${role.roleName}`);
        console.log('  ' + '-'.repeat(40));

        // Is role ki saari permissions lo
        const rolePermissions = await RolePermission.find({
          roleId: role._id,
          companyId: company._id
        }).populate('permissionId');

        if (rolePermissions.length === 0) {
          console.log('    ⚠️  Koi permission assign nahi hai!');
        } else {
          rolePermissions.forEach((rp, index) => {
            const perm = rp.permissionId;
            console.log(`    ${index + 1}. ✅ ${perm.permissionKey.padEnd(25)} (${perm.module} → ${perm.action})`);
          });
          console.log(`\n    📊 Total: ${rolePermissions.length} permissions`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

checkAllRolePermissions();
