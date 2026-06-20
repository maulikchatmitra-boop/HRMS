import mongoose from 'mongoose';
import Company from '../models/company.model.js';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import Permission from '../models/permission.model.js';
import RolePermission from '../models/role-permission.model.js';
import { hashPassword } from '../utils/auth.utils.js';
import { logAction } from './auditLog.service.js';

/**
 * Onboards a new company (tenant) and seeds default roles, mappings, and the primary admin user.
 * Admin controlled only. Uses sequential saves with manual cleanup on error (no replica set required).
 * @param {Object} companyData - Company metadata.
 * @param {Object} adminUserData - Primary admin user details.
 * @param {string} [actorId] - ID of the system admin performing this operation.
 * @returns {Promise<Object>} Object containing the onboarded company, default roles, and admin user.
 */
export const onboardCompany = async (companyData, adminUserData, actorId = null) => {
  let savedCompany = null;
  let savedRoles = [];
  let savedAdminUser = null;

  try {
    // 1. Verify companyCode uniqueness
    const existingCompany = await Company.findOne({
      companyCode: companyData.companyCode.toUpperCase()
    });

    if (existingCompany) {
      throw new Error(`Company with code '${companyData.companyCode}' already exists.`);
    }

    // 1b. Verify company email uniqueness
    const existingCompanyEmail = await Company.findOne({
      email: companyData.email.toLowerCase()
    });

    if (existingCompanyEmail) {
      throw new Error(`Company contact email '${companyData.email}' is already registered.`);
    }

    // 1c. Verify admin email uniqueness (global uniqueness across all companies/users)
    const existingAdminEmail = await User.findOne({
      email: adminUserData.email.toLowerCase()
    });

    if (existingAdminEmail) {
      throw new Error(`Admin email '${adminUserData.email}' is already registered.`);
    }

    // 2. Pre-generate IDs to resolve circular dependencies (createdBy → adminUserId)
    const companyId = new mongoose.Types.ObjectId();
    const adminUserId = new mongoose.Types.ObjectId();

    const roleIds = {
      companyAdmin: new mongoose.Types.ObjectId()
    };

    const creatorId = actorId || adminUserId;

    // 3. Save Company
    savedCompany = await Company.create({
      _id: companyId,
      companyName: companyData.companyName,
      companyCode: companyData.companyCode.toUpperCase(),
      email: companyData.email,
      phone: companyData.phone,
      status: companyData.status || 'active',
      subscriptionStatus: companyData.subscriptionStatus || 'trial',
      plan: companyData.plan || 'basic'
    });

    // 4. Save default roles (Only Company Admin by request, no other default roles)
    const rolesToCreate = [
      {
        _id: roleIds.companyAdmin,
        companyId,
        roleName: 'Company Admin',
        description: 'Full administrative access to all company settings and records.',
        createdBy: creatorId,
        updatedBy: creatorId
      }
    ];

    savedRoles = await Role.insertMany(rolesToCreate);

    // 5. Fetch all global permissions
    const permissions = await Permission.find({});

    if (permissions.length === 0) {
      throw new Error('Global permissions are not seeded. Please run: npm run seed');
    }

    // 6. Build role-permission mappings
    const rolePermissionMappings = [];

    const addMapping = (roleId, permissionKey) => {
      const perm = permissions.find(p => p.permissionKey === permissionKey);
      if (perm) {
        rolePermissionMappings.push({
          companyId,
          roleId,
          permissionId: perm._id,
          createdBy: creatorId,
          updatedBy: creatorId
        });
      }
    };

    permissions.forEach(perm => {
      const key = perm.permissionKey;

      // Company Admin → all permissions
      addMapping(roleIds.companyAdmin, key);
    });

    if (rolePermissionMappings.length > 0) {
      await RolePermission.insertMany(rolePermissionMappings);
    }

    // 7. Hash password and save admin user
    const passwordHash = await hashPassword(adminUserData.password);

    savedAdminUser = await User.create({
      _id: adminUserId,
      companyId,
      firstName: adminUserData.firstName,
      lastName: adminUserData.lastName,
      email: adminUserData.email.toLowerCase(),
      password: passwordHash,
      roleId: roleIds.companyAdmin,
      status: 'active',
      createdBy: creatorId,
      updatedBy: creatorId
    });

    // 8. Audit log
    await logAction({
      companyId,
      userId: adminUserId,
      module: 'company',
      action: 'onboard',
      newData: { companyId, companyName: savedCompany.companyName },
      ipAddress: 'SYSTEM'
    });

    const cleanAdminUser = savedAdminUser.toObject();
    delete cleanAdminUser.password;

    return {
      company: savedCompany,
      roles: savedRoles,
      adminUser: cleanAdminUser
    };

  } catch (error) {
    // Manual cleanup on failure to keep database consistent
    if (savedAdminUser) {
      await User.deleteOne({ _id: savedAdminUser._id }).catch(() => {});
    }
    if (savedRoles.length > 0) {
      const roleIds = savedRoles.map(r => r._id);
      await Role.deleteMany({ _id: { $in: roleIds } }).catch(() => {});
      await RolePermission.deleteMany({ roleId: { $in: roleIds } }).catch(() => {});
    }
    if (savedCompany) {
      await Company.deleteOne({ _id: savedCompany._id }).catch(() => {});
    }
    throw error;
  }
};


