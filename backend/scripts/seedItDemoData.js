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
import HolidayCalendar from '../src/models/holiday-calendar.model.js';
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

async function seedCompany(companyDetails, adminDetails, departments, designations, branches, shifts, holidays, permissions) {
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

  // 2. Create Roles with Realistic IT Company Permissions
  const roles = {};
  const roleDefinitions = [
    {
      roleName: 'Company Admin',
      description: 'Full administrative access to IT operations.',
      perms: permissions.map(p => p.permissionKey) // All permissions
    },
    {
      roleName: 'HR',
      description: 'IT Talent Acquisition & Employee Management.',
      perms: [
        'employee.create', 'employee.view', 'employee.edit', 'employee.delete',
        'department.view', 'designation.view', 'branch.view', 'shift.view',
        'holiday.view', 'holiday.create', 'holiday.edit', 'holiday.delete', 'audit.view'
      ]
    },
    {
      roleName: 'Employee',
      description: 'Software Engineer / Developer access.',
      perms: [
        'employee.view', 'holiday.view'
      ]
    }
  ];

  for (const rDef of roleDefinitions) {
    const roleId = new mongoose.Types.ObjectId();
    const role = await Role.create({
      _id: roleId,
      companyId,
      roleName: rDef.roleName,
      description: rDef.description,
      createdBy: creatorId,
      updatedBy: creatorId
    });
    roles[rDef.roleName] = role;

    // Filter permitted docs
    const targetPermDocs = permissions.filter(p => rDef.perms.includes(p.permissionKey));
    const mappings = targetPermDocs.map(perm => ({
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

  // 8. Create Holidays
  for (const h of holidays) {
    await HolidayCalendar.create({
      companyId,
      name: h.name,
      date: new Date(h.date),
      description: h.description,
      isOptional: h.isOptional || false,
      createdBy: creatorId,
      updatedBy: creatorId
    });
  }

  // 9. Create HR User
  const hrPasswordHash = await hashPassword('HRUser@123');
  const hrUser = await User.create({
    companyId,
    firstName: 'Priya',
    lastName: 'Sharma',
    email: `hr@${companyDetails.domain}`,
    password: hrPasswordHash,
    roleId: roles['HR']._id,
    status: 'active',
    departmentId: deptDocs.find(d => d.code === 'HR')?._id || deptDocs[0]?._id,
    designationId: desDocs.find(d => d.title.includes('HR'))?._id || desDocs[0]?._id,
    branchId: branchDocs[0]?._id || null,
    shiftId: shiftDocs[0]?._id || null,
    createdBy: creatorId,
    updatedBy: creatorId
  });

  // 10. Create Manager User (Project Manager)
  const managerPasswordHash = await hashPassword('ManagerUser@123');
  const managerUser = await User.create({
    companyId,
    firstName: 'Amit',
    lastName: 'Patel',
    email: `pm@${companyDetails.domain}`,
    password: managerPasswordHash,
    roleId: roles['Employee']._id,
    status: 'active',
    departmentId: deptDocs.find(d => d.code === 'DEV')?._id || deptDocs[0]?._id,
    designationId: desDocs.find(d => d.title.includes('Lead') || d.title.includes('Manager'))?._id || desDocs[0]?._id,
    branchId: branchDocs[0]?._id || null,
    shiftId: shiftDocs[0]?._id || null,
    createdBy: creatorId,
    updatedBy: creatorId
  });

  // 11. Create Employee User (Developer / Analyst)
  const employeePasswordHash = await hashPassword('EmployeeUser@123');
  const employeeUser = await User.create({
    companyId,
    firstName: 'Rohan',
    lastName: 'Joshi',
    email: `dev@${companyDetails.domain}`,
    password: employeePasswordHash,
    roleId: roles['Employee']._id,
    status: 'active',
    departmentId: deptDocs.find(d => d.code === 'DEV')?._id || deptDocs[0]?._id,
    designationId: desDocs.find(d => d.title.includes('Engineer') || d.title.includes('Consultant'))?._id || desDocs[0]?._id,
    branchId: branchDocs[0]?._id || null,
    shiftId: shiftDocs[0]?._id || null,
    reportingManagerId: managerUser._id,
    createdBy: creatorId,
    updatedBy: creatorId
  });

  console.log(`✅ Seeded IT Company: ${companyDetails.name} (${companyDetails.code})`);
}

async function seed() {
  try {
    console.log('=== Seeding IT Company Real-World Demo Data ===');
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

    // 4. Seed Company 1: Infosys Limited
    await seedCompany(
      { name: 'Infosys Limited', code: 'INFY', email: 'contact@infosys.com', phone: '9812345670', domain: 'infosys.com' },
      { firstName: 'Salil', lastName: 'Parekh', email: 'admin@infosys.com', password: 'Admin@123' },
      [
        { name: 'Software Development', code: 'DEV', description: 'Web application and cloud microservices development.' },
        { name: 'Quality Assurance', code: 'QA', description: 'Automation testing, sanity, and regression pipelines.' },
        { name: 'Human Resources', code: 'HR', description: 'Talent management, employee onboarding and benefits.' }
      ],
      [
        { title: 'Senior Software Engineer', description: 'Writes Node.js backends and React frontends.' },
        { title: 'QA Lead', description: 'Designs Selenium and Playwright automation frameworks.' },
        { title: 'HR Specialist', description: 'Handles employee onboarding and salary payroll.' }
      ],
      [
        { name: 'Infosys Pune Phase 2', address: 'Plot No. 1, Hinjawadi IT Park', city: 'Pune', state: 'Maharashtra', country: 'India', zipCode: '411057' }
      ],
      [
        { name: 'IT General Shift', startTime: '09:00', endTime: '18:00', description: 'Infosys Standard day shift.' },
        { name: 'IT Night Support', startTime: '22:00', endTime: '06:00', description: '24/7 client critical operations.' }
      ],
      [
        { name: 'New Year', date: '2026-01-01', description: 'Start of the calendar year.' },
        { name: 'Independence Day', date: '2026-08-15', description: 'National holiday.' },
        { name: 'Diwali', date: '2026-11-09', description: 'Festival of lights.' }
      ],
      permissions
    );

    // 5. Seed Company 2: Wipro Technologies
    await seedCompany(
      { name: 'Wipro Technologies', code: 'WIPRO', email: 'contact@wipro.com', phone: '8712345670', domain: 'wipro.com' },
      { firstName: 'Thierry', lastName: 'Delaporte', email: 'admin@wipro.com', password: 'Admin@123' },
      [
        { name: 'Software Development', code: 'DEV', description: 'Core product engineering and Java development.' },
        { name: 'Cloud Infrastructure Services', code: 'CLOUD', description: 'AWS, Azure, and Google Cloud platform administration.' }
      ],
      [
        { title: 'Cloud Architect', description: 'Designs Kubernetes clusters and terraform configurations.' },
        { title: 'Product Manager', description: 'Manages agile backlogs and sprint plannings.' }
      ],
      [
        { name: 'Wipro Bangalore EC', address: 'Electronic City Phase 1', city: 'Bangalore', state: 'Karnataka', country: 'India', zipCode: '560100' }
      ],
      [
        { name: 'Standard IT Shift', startTime: '09:30', endTime: '18:30', description: 'Wipro general shift.' },
        { name: 'US Client Support Shift', startTime: '18:30', endTime: '03:30', description: 'Overlapping hours with US East Coast.' }
      ],
      [
        { name: 'New Year', date: '2026-01-01', description: 'Global holiday.' },
        { name: 'Republic Day', date: '2026-01-26', description: 'National celebration.' },
        { name: 'Gandhi Jayanti', date: '2026-10-02', description: 'Mahatma Gandhi birthday.' }
      ],
      permissions
    );

    // 6. Seed Company 3: Tata Consultancy Services (TCS)
    await seedCompany(
      { name: 'TCS Limited', code: 'TCS', email: 'contact@tcs.com', phone: '7612345670', domain: 'tcs.com' },
      { firstName: 'K', lastName: 'Krithivasan', email: 'admin@tcs.com', password: 'Admin@123' },
      [
        { name: 'Software Development', code: 'DEV', description: 'Large-scale enterprise application engineering.' },
        { name: 'Cyber Security Services', code: 'SEC', description: 'Penetration testing and incident response.' },
        { name: 'DevOps & Platform Engineering', code: 'DEVOPS', description: 'CI/CD pipeline automations.' }
      ],
      [
        { title: 'Security Consultant', description: 'Conducts OWASP vulnerability assessments.' },
        { title: 'DevOps Engineer', description: 'Manages Jenkins, Docker, and Kubernetes clusters.' }
      ],
      [
        { name: 'TCS Noida Sector 62', address: 'Block A, Sector 62', city: 'Noida', state: 'Uttar Pradesh', country: 'India', zipCode: '201309' }
      ],
      [
        { name: 'TCS Normal Shift', startTime: '09:00', endTime: '18:00', description: 'Standard TCS office hours.' }
      ],
      [
        { name: 'New Year', date: '2026-01-01', description: 'Global holiday.' },
        { name: 'Holi', date: '2026-03-03', description: 'Festival of colors.' },
        { name: 'Christmas', date: '2026-12-25', description: 'Winter holiday.' }
      ],
      permissions
    );

    console.log('\n🚀 MULTI-COMPANY IT DEMO SEED COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during IT demo seeding:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
