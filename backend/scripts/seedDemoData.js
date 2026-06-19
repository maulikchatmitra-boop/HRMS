import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDatabase from '../src/database/connection.js';
import Company from '../src/models/company.model.js';
import User from '../src/models/user.model.js';
import Role from '../src/models/role.model.js';
import Department from '../src/models/department.model.js';
import Designation from '../src/models/designation.model.js';
import Branch from '../src/models/branch.model.js';
import Shift from '../src/models/shift.model.js';
import { hashPassword } from '../src/utils/auth.utils.js';

dotenv.config();

async function seedCompany(companyDetails, adminDetails, departments, designations, branches, shifts) {
  const companyId = new mongoose.Types.ObjectId();
  const adminUserId = new mongoose.Types.ObjectId();
  const creatorId = adminUserId;

  // 1. Create Company
  const company = await Company.create({
    _id: companyId,
    companyName: companyDetails.name,
    companyCode: companyDetails.code,
    email: companyDetails.email,
    phone: companyDetails.phone,
    status: 'active',
    subscriptionStatus: 'active',
    plan: 'enterprise'
  });

  // 2. Create Default Roles
  const roles = {};
  const roleNames = ['Company Admin', 'HR', 'Manager', 'Employee'];
  
  for (const rName of roleNames) {
    const roleId = new mongoose.Types.ObjectId();
    const role = await Role.create({
      _id: roleId,
      companyId,
      roleName: rName,
      description: `${rName} default system role.`,
      createdBy: creatorId,
      updatedBy: creatorId
    });
    roles[rName] = role;
  }

  // 3. Create Admin User
  const adminPasswordHash = await hashPassword(adminDetails.password);
  const adminUser = await User.create({
    _id: adminUserId,
    companyId,
    firstName: adminDetails.firstName,
    lastName: adminDetails.lastName,
    email: adminDetails.email.toLowerCase(),
    password: adminPasswordHash,
    roleId: roles['Company Admin']._id,
    status: 'active',
    createdBy: creatorId,
    updatedBy: creatorId
  });

  // 4. Create Departments
  const deptDocs = [];
  for (const d of departments) {
    const dept = await Department.create({
      companyId,
      name: d.name,
      code: d.code,
      description: d.description,
      createdBy: creatorId,
      updatedBy: creatorId
    });
    deptDocs.push(dept);
  }

  // 5. Create Designations
  const desDocs = [];
  for (const d of designations) {
    const des = await Designation.create({
      companyId,
      title: d.title,
      description: d.description,
      createdBy: creatorId,
      updatedBy: creatorId
    });
    desDocs.push(des);
  }

  // 6. Create Branches
  const branchDocs = [];
  for (const b of branches) {
    const br = await Branch.create({
      companyId,
      name: b.name,
      address: b.address,
      city: b.city,
      state: b.state,
      country: b.country,
      zipCode: b.zipCode,
      createdBy: creatorId,
      updatedBy: creatorId
    });
    branchDocs.push(br);
  }

  // 7. Create Shifts
  const shiftDocs = [];
  for (const s of shifts) {
    const sh = await Shift.create({
      companyId,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      description: s.description,
      createdBy: creatorId,
      updatedBy: creatorId
    });
    shiftDocs.push(sh);
  }

  // Assign shift to admin user
  if (shiftDocs.length > 0) {
    await User.findByIdAndUpdate(adminUserId, { shiftId: shiftDocs[0]._id });
  }

  // 8. Create HR User
  const hrPasswordHash = await hashPassword('HRUser@123');
  const hrUser = await User.create({
    companyId,
    firstName: 'Ardeshir',
    lastName: 'HR',
    email: `hr@${companyDetails.domain}`,
    password: hrPasswordHash,
    roleId: roles['HR']._id,
    status: 'active',
    departmentId: deptDocs[0]?._id || null,
    designationId: desDocs[0]?._id || null,
    branchId: branchDocs[0]?._id || null,
    shiftId: shiftDocs[0]?._id || null,
    createdBy: creatorId,
    updatedBy: creatorId
  });

  // 9. Create Manager User
  const managerPasswordHash = await hashPassword('ManagerUser@123');
  const managerUser = await User.create({
    companyId,
    firstName: 'Jamsetji',
    lastName: 'Manager',
    email: `manager@${companyDetails.domain}`,
    password: managerPasswordHash,
    roleId: roles['Manager']._id,
    status: 'active',
    departmentId: deptDocs[0]?._id || null,
    designationId: desDocs[0]?._id || null,
    branchId: branchDocs[0]?._id || null,
    shiftId: shiftDocs[0]?._id || null,
    createdBy: creatorId,
    updatedBy: creatorId
  });

  // 10. Create Employee User
  const employeePasswordHash = await hashPassword('EmployeeUser@123');
  const employeeUser = await User.create({
    companyId,
    firstName: 'Dorabji',
    lastName: 'Employee',
    email: `employee@${companyDetails.domain}`,
    password: employeePasswordHash,
    roleId: roles['Employee']._id,
    status: 'active',
    departmentId: deptDocs[0]?._id || null,
    designationId: desDocs[1]?._id || null,
    branchId: branchDocs[0]?._id || null,
    shiftId: shiftDocs[0]?._id || null,
    reportingManagerId: managerUser._id,
    createdBy: creatorId,
    updatedBy: creatorId
  });

  console.log(`✅ Seeded Company: ${companyDetails.name} (${companyDetails.code})`);
}

async function seed() {
  try {
    console.log('=== Seeding Multi-Company Demo Data ===');
    await connectDatabase();

    // 1. Clear database
    console.log('Dropping existing database...');
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped successfully.');

    // 2. Seed Super Admin
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

    // 3. Seed Company 1: Tata Steel
    await seedCompany(
      { name: 'Tata Steel', code: 'TATA', email: 'contact@tata.com', phone: '9871234560', domain: 'tata.com' },
      { firstName: 'Ratan', lastName: 'Tata', email: 'admin@tata.com', password: 'Admin@123' },
      [
        { name: 'Steel Production', code: 'PROD', description: 'Raw iron ore melting and sheet production.' },
        { name: 'Corporate Logistics', code: 'LOG', description: 'Internal fleet and cargo shipping.' }
      ],
      [
        { title: 'Production Supervisor', description: 'Oversees daily raw steel processing.' },
        { title: 'Logistics Coordinator', description: 'Manages freight scheduling and vendor relations.' }
      ],
      [
        { name: 'Tata Jamshedpur Plant', address: 'Jamshedpur Works', city: 'Jamshedpur', state: 'Jharkhand', country: 'India', zipCode: '831001' }
      ],
      [
        { name: 'Tata Standard Day Shift', startTime: '09:00', endTime: '17:00', description: 'Standard day operations.' }
      ]
    );

    // 4. Seed Company 2: Adani Power
    await seedCompany(
      { name: 'Adani Power', code: 'ADANI', email: 'contact@adani.com', phone: '9876543210', domain: 'adani.com' },
      { firstName: 'Gautam', lastName: 'Adani', email: 'admin@adani.com', password: 'Admin@123' },
      [
        { name: 'Solar Operations', code: 'SOLAR', description: 'Photovoltaic cells operations and cleaning.' },
        { name: 'Thermal Power', code: 'THERM', description: 'Coal furnace and turbine maintenance.' }
      ],
      [
        { title: 'Grid Operations Head', description: 'Monitors direct current distribution.' },
        { title: 'Turbine Mechanic', description: 'Inspects high pressure thermal steam arrays.' }
      ],
      [
        { name: 'Mundra Solar Park', address: 'APSEZ Mundra Port', city: 'Mundra', state: 'Gujarat', country: 'India', zipCode: '370421' }
      ],
      [
        { name: 'Adani Morning Shift', startTime: '06:00', endTime: '14:00', description: 'Peak sun array checks.' },
        { name: 'Adani Evening Shift', startTime: '14:00', endTime: '22:00', description: 'Array shutdown and cleanup.' }
      ]
    );

    // 5. Seed Company 3: Reliance Retail
    await seedCompany(
      { name: 'Reliance Retail', code: 'RELIANCE', email: 'contact@reliance.com', phone: '7654321098', domain: 'reliance.com' },
      { firstName: 'Mukesh', lastName: 'Ambani', email: 'admin@reliance.com', password: 'Admin@123' },
      [
        { name: 'Store Operations', code: 'STORE', description: 'Retail branch stocking and cashier stations.' },
        { name: 'Inventory Logistics', code: 'INV', description: 'Warehouse logistics and supply logistics.' }
      ],
      [
        { title: 'Store Operations Head', description: 'Directs cashier operations and shifts.' },
        { title: 'Inventory Analyst', description: 'Monitors warehouse stock volumes.' }
      ],
      [
        { name: 'Mumbai Retail Hub', address: 'Bandra Kurla Complex', city: 'Mumbai', state: 'Maharashtra', country: 'India', zipCode: '400051' }
      ],
      [
        { name: 'Reliance Retail Standard Shift', startTime: '10:00', endTime: '18:00', description: 'Standard retail hours.' }
      ]
    );

    console.log('\n🚀 MULTI-COMPANY DEMO SEED COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during demo seeding:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
