/**
 * Super Admin Seed Script
 * 
 * Ek baar run karo — Super Admin user ban jaayega
 * Command: node scripts/seedSuperAdmin.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import User from '../src/models/user.model.js';
import { hashPassword } from '../src/utils/auth.utils.js';

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await connectDatabase();
    console.log('─────────────────────────────────');
    console.log('  Super Admin Seed Script');
    console.log('─────────────────────────────────');

    // Pehle check karo — already hai kya?
    const existing = await User.findOne({ isSuperAdmin: true });
    if (existing) {
      console.log('✅ Super Admin already exists!');
      console.log(`   Email: ${existing.email}`);
      console.log('   Seed skipped.');
      return;
    }

    // Super Admin banao
    const hashedPassword = await hashPassword('SuperAdmin@123');

    const superAdmin = new User({
      companyId:    null,           // Kisi company ka nahi
      firstName:    'Super',
      lastName:     'Admin',
      email:        'superadmin@hrms.com',
      password:     hashedPassword,
      roleId:       null,           // Koi role nahi
      isSuperAdmin: true,           // Platform owner
      status:       'active',
    });

    await superAdmin.save();

    console.log('✅ Super Admin created successfully!');
    console.log('─────────────────────────────────');
    console.log('   Email   : superadmin@hrms.com');
    console.log('   Password: SuperAdmin@123');
    console.log('─────────────────────────────────');
    console.log('⚠️  Production mein password zaroor badlo!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  }
};

seedSuperAdmin();
