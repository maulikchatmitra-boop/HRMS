import Permission from '../models/permission.model.js';
import Company from '../models/company.model.js';
import Role from '../models/role.model.js';
import RolePermission from '../models/role-permission.model.js';

const systemPermissions = [
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
  { module: 'holiday', action: 'delete', permissionKey: 'holiday.delete' },

  // Leave Type permissions
  { module: 'leaveType', action: 'create', permissionKey: 'leaveType.create' },
  { module: 'leaveType', action: 'view',   permissionKey: 'leaveType.view' },
  { module: 'leaveType', action: 'edit',   permissionKey: 'leaveType.edit' },
  { module: 'leaveType', action: 'delete', permissionKey: 'leaveType.delete' },

  // Leave Policy permissions
  { module: 'leavePolicy', action: 'create', permissionKey: 'leavePolicy.create' },
  { module: 'leavePolicy', action: 'view',   permissionKey: 'leavePolicy.view' },
  { module: 'leavePolicy', action: 'edit',   permissionKey: 'leavePolicy.edit' },
  { module: 'leavePolicy', action: 'delete', permissionKey: 'leavePolicy.delete' },

  // Leave Balance permissions
  { module: 'leaveBalance', action: 'view',   permissionKey: 'leaveBalance.view' },
  { module: 'leaveBalance', action: 'manage', permissionKey: 'leaveBalance.manage' },

  // Leave Request permissions
  { module: 'leave', action: 'apply',    permissionKey: 'leave.apply' },
  { module: 'leave', action: 'viewOwn',  permissionKey: 'leave.viewOwn' },
  { module: 'leave', action: 'viewAll',  permissionKey: 'leave.viewAll' },
  { module: 'leave', action: 'cancel',   permissionKey: 'leave.cancel' },
  { module: 'leave', action: 'approve',  permissionKey: 'leave.approve' },
  { module: 'leave', action: 'reject',   permissionKey: 'leave.reject' },
  { module: 'leave', action: 'sendBack', permissionKey: 'leave.sendBack' },

  // Leave Calendar / History permissions
  { module: 'leaveCalendar', action: 'view', permissionKey: 'leaveCalendar.view' },
  { module: 'leaveHistory',  action: 'view', permissionKey: 'leaveHistory.view' },

  // Document module permissions
  { module: 'document', action: 'view',     permissionKey: 'document.view' },
  { module: 'document', action: 'upload',   permissionKey: 'document.upload' },
  { module: 'document', action: 'delete',   permissionKey: 'document.delete' },
  { module: 'document', action: 'download', permissionKey: 'document.download' },
  { module: 'document', action: 'verify',   permissionKey: 'document.verify' }
];

export const autoBootstrapDatabase = async () => {
  try {
    console.log('🔄 Checking database system permissions & mapping configurations...');

    // 1. Seed global permissions
    const seededPermissions = [];
    for (const perm of systemPermissions) {
      let doc = await Permission.findOne({ permissionKey: perm.permissionKey });
      if (!doc) {
        doc = await Permission.create(perm);
        console.log(`+ Created core Permission: ${perm.permissionKey}`);
      }
      seededPermissions.push(doc);
    }

    // 2. Fetch all companies and sync their roles
    const companies = await Company.find({});
    for (const company of companies) {
      const roles = await Role.find({ companyId: company._id });

      for (const role of roles) {
        const roleName = role.roleName.toLowerCase();
        let eligibleKeys = [];

        // Define permissions maps by role keyword
        if (roleName.includes('admin') || roleName.includes('hr')) {
          // Admins & HR get all system permissions
          eligibleKeys = systemPermissions.map(p => p.permissionKey);
        } else if (roleName.includes('manager') || roleName.includes('lead')) {
          // Managers get view-only on base models and full actions on leaves
          eligibleKeys = [
            'employee.view',
            'company.view',
            'role.view',
            'department.view',
            'designation.view',
            'branch.view',
            'shift.view',
            'employeeType.view',
            'workLocation.view',
            'holiday.view',
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
            'leaveHistory.view',
            'document.view',
            'document.download'
          ];
        } else {
          // Employees / Default roles get view-only base and standard own leaves
          eligibleKeys = [
            'holiday.view',
            'leaveBalance.view',
            'leave.apply',
            'leave.viewOwn',
            'leave.cancel',
            'leaveCalendar.view',
            'document.view',
            'document.download'
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
            console.log(`+ Mapped permission [${key}] to role [${role.roleName}] for company [${company.companyCode}]`);
          }
        }
      }
    }

    console.log('✅ Permissions and role-mapping synced successfully.');
  } catch (error) {
    console.error('❌ Database automatic bootstrap failed:', error);
  }
};
