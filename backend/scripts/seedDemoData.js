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
  { module: 'holiday', action: 'delete', permissionKey: 'holiday.delete' }
];

async function seedCompany(companyDetails, adminDetails, departments, designations, branches, shifts, permissions) {
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

    // Map permissions to Role
    const mappings = permissions.map(perm => ({
      companyId,
      roleId,
      permissionId: perm._id,
      createdBy: creatorId,
      updatedBy: creatorId
    }));
    await RolePermission.insertMany(mappings);
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

    // 2. Seed Permissions
    console.log('Seeding global system permissions...');
    const permissions = await Permission.insertMany(permissionsToSeed);
    console.log(`Successfully seeded ${permissions.length} permissions.`);

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

    // 4. Seed Company 1: Tata Steel
    await seedCompany(
      { name: 'Tata Steel', code: 'TATA', email: 'contact@tata.com', phone: '9871234560', domain: 'tata.com' },
      { firstName: 'Ratan', lastName: 'Tata', email: 'admin@tata.com', password: 'Admin@123' },
      [
        { name: 'Steel Production', code: 'PROD', description: 'Raw iron ore melting and sheet production.' },
        { name: 'Logistics Operations', code: 'LOG', description: 'Supply chain management and railway shipping.' }
      ],
      [
        { title: 'Production Specialist', description: 'Monitors blast furnace operations.' },
        { title: 'Logistics Supervisor', description: 'Manages bulk shipment manifests.' }
      ],
      [
        { name: 'Jamshedpur Works', address: 'Bistupur Boulevard', city: 'Jamshedpur', state: 'Jharkhand', country: 'India', zipCode: '831001' }
      ],
      [
        { name: 'Tata Day Shift', startTime: '09:00', endTime: '17:00', description: 'Standard day operations.' },
        { name: 'Tata Night Shift', startTime: '21:00', endTime: '05:00', description: 'Blast furnace overnight monitoring.' }
      ],
      permissions
    );

    // 5. Seed Company 2: Adani Power
    await seedCompany(
      { name: 'Adani Power', code: 'ADANI', email: 'contact@adani.com', phone: '8765432109', domain: 'adani.com' },
      { firstName: 'Gautam', lastName: 'Adani', email: 'admin@adani.com', password: 'Admin@123' },
      [
        { name: 'Solar Grid Operations', code: 'SOLAR', description: 'Photovoltaic generation and inverter controls.' },
        { name: 'Safety & Compliance', code: 'SAFE', description: 'Thermal plant safety regulations.' }
      ],
      [
        { title: 'Solar Array Engineer', description: 'Oversees tracking systems and performance.' },
        { title: 'Safety Analyst', description: 'Reviews safety drills and safety compliance.' }
      ],
      [
        { name: 'Mundra Solar Park', address: 'APSEZ Mundra Port', city: 'Mundra', state: 'Gujarat', country: 'India', zipCode: '370421' }
      ],
      [
        { name: 'Adani Morning Shift', startTime: '06:00', endTime: '14:00', description: 'Peak sun array checks.' },
        { name: 'Adani Evening Shift', startTime: '14:00', endTime: '22:00', description: 'Array shutdown and cleanup.' }
      ],
      permissions
    );

    // 6. Seed Company 3: Reliance Retail
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
      ],
      permissions
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
