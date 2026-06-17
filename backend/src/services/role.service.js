import Role from '../models/role.model.js';
import RolePermission from '../models/role-permission.model.js';
import User from '../models/user.model.js';
import Permission from '../models/permission.model.js';
import { logAction } from './auditLog.service.js';
import mongoose from 'mongoose';

/**
 * Creates a new role.
 * @param {string} companyId - Tenant ID.
 * @param {Object} roleData - Role attributes.
 * @param {string} actorId - Acting user ID.
 * @returns {Promise<Object>} Created role document.
 */
export const createRole = async (companyId, roleData, actorId) => {
  // 1. Check uniqueness of roleName within company
  const existingRole = await Role.findOne({ companyId, roleName: roleData.roleName });
  if (existingRole) {
    throw new Error('A role with this name already exists in your company.');
  }

  const role = new Role({
    companyId,
    roleName: roleData.roleName,
    description: roleData.description,
    createdBy: actorId,
    updatedBy: actorId
  });

  const savedRole = await role.save();

  await logAction({
    companyId,
    userId: actorId,
    module: 'role',
    action: 'create',
    newData: savedRole.toObject()
  });

  return savedRole;
};

/**
 * Gets all roles for a company.
 * Company Admin ko sab roles dikhte hain
 * HR/Manager/Employee ko sirf non-admin roles dikhte hain
 * @param {string} companyId - Tenant ID.
 * @param {string} requesterRole - Requesting user's role name
 * @returns {Promise<Array>} List of roles.
 */
export const getRoles = async (companyId, requesterRole = null) => {
  // Exclude Company Admin from all retrieved roles to prevent manual changes
  return await Role.find({
    companyId,
    roleName: { $ne: 'Company Admin' }
  });
};

/**
 * Updates a role.
 * @param {string} companyId - Tenant ID.
 * @param {string} roleId - Role ID to update.
 * @param {Object} updateData - Updatable fields.
 * @param {string} actorId - Acting user ID.
 * @returns {Promise<Object>} Updated role document.
 */
export const updateRole = async (companyId, roleId, updateData, actorId) => {
  const oldRole = await Role.findById(roleId);
  if (!oldRole) {
    throw new Error('Role not found.');
  }
  if (companyId && oldRole.companyId && oldRole.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  if (oldRole.roleName === 'Company Admin') {
    throw new Error('Cannot modify the Company Admin system role.');
  }

  // Prevent duplicate roleName if it changes
  if (updateData.roleName && updateData.roleName !== oldRole.roleName) {
    const duplicate = await Role.findOne({ companyId, roleName: updateData.roleName });
    if (duplicate) {
      throw new Error('A role with this name already exists in your company.');
    }
  }

  const updatedRole = await Role.findOneAndUpdate(
    { _id: roleId },
    {
      $set: {
        roleName: updateData.roleName || oldRole.roleName,
        description: updateData.description !== undefined ? updateData.description : oldRole.description,
        updatedBy: actorId
      }
    },
    { new: true, runValidators: true }
  );

  await logAction({
    companyId,
    userId: actorId,
    module: 'role',
    action: 'update',
    oldData: oldRole.toObject(),
    newData: updatedRole.toObject()
  });

  return updatedRole;
};

/**
 * Deletes a role.
 * Checks that no user is currently using this role before deletion.
 * @param {string} companyId - Tenant ID.
 * @param {string} roleId - Role ID to delete.
 * @param {string} actorId - Acting user ID.
 * @returns {Promise<Object>} Deleted role document.
 */
export const deleteRole = async (companyId, roleId, actorId) => {
  const oldRole = await Role.findById(roleId);
  if (!oldRole) {
    throw new Error('Role not found.');
  }
  if (companyId && oldRole.companyId && oldRole.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  if (oldRole.roleName === 'Company Admin') {
    throw new Error('Cannot delete the Company Admin system role.');
  }

  // Check if any user is currently assigned this role
  const userAssigned = await User.findOne({ companyId, roleId });
  if (userAssigned) {
    throw new Error('Cannot delete this role because it is currently assigned to one or more users.');
  }

  // Delete role permission mappings
  await RolePermission.deleteMany({ companyId, roleId });

  // Delete role
  const deletedRole = await Role.findOneAndDelete({ _id: roleId });

  // Audit log
  await logAction({
    companyId,
    userId: actorId,
    module: 'role',
    action: 'delete',
    oldData: oldRole.toObject(),
    newData: null
  });

  return deletedRole;
};

/**
 * Assigns permissions to a role. Replaces all previous permission mappings for this role.
 * @param {string} companyId - Tenant ID.
 * @param {string} roleId - Role ID.
 * @param {Array<string>} permissionIds - Array of global permission ObjectIds.
 * @param {string} actorId - Acting user ID.
 * @returns {Promise<Array>} List of new RolePermission documents.
 */
export const assignPermissionsToRole = async (companyId, roleId, permissionIds, actorId) => {
  const role = await Role.findById(roleId);
  if (!role) throw new Error('Role not found.');
  if (companyId && role.companyId && role.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  if (role.roleName === 'Company Admin') {
    throw new Error('Cannot assign permissions to the Company Admin system role.');
  }

  const validPermissions = await Permission.find({ _id: { $in: permissionIds } });
  if (validPermissions.length !== permissionIds.length) {
    throw new Error('One or more permission IDs are invalid.');
  }

  const oldMappings = await RolePermission.find({ companyId, roleId })
    .populate('permissionId', 'permissionKey module action');

  // ─── Standard Sequential Execution (Safe for standalone MongoDB deployments) ───
  await RolePermission.deleteMany({ companyId, roleId });

  let savedMappings = [];
  const newMappings = permissionIds.map(permId => ({
    companyId, roleId, permissionId: permId,
    createdBy: actorId, updatedBy: actorId
  }));

  if (newMappings.length > 0) {
    savedMappings = await RolePermission.insertMany(newMappings);
  }

  // Fetch with names for clean audit log
  const savedWithNames = await RolePermission.find({ companyId, roleId })
    .populate('permissionId', 'permissionKey module action');

  const oldList = oldMappings.map(m => ({
    permissionId:  m.permissionId._id,
    permissionKey: m.permissionId.permissionKey,
    module:        m.permissionId.module,
    action:        m.permissionId.action,
  }));

  const newList = savedWithNames.map(m => ({
    permissionId:  m.permissionId._id,
    permissionKey: m.permissionId.permissionKey,
    module:        m.permissionId.module,
    action:        m.permissionId.action,
  }));

  const addedPermissions   = newList.filter(np => !oldList.some(op => op.permissionId.toString() === np.permissionId.toString()));
  const removedPermissions = oldList.filter(op => !newList.some(np => np.permissionId.toString() === op.permissionId.toString()));

  await logAction({
    companyId, userId: actorId,
    module: 'role_permission', action: 'assign',
    oldData: { roleName: role.roleName, permissions: oldList, total: oldList.length },
    newData: { roleName: role.roleName, permissions: newList, total: newList.length, addedPermissions, removedPermissions }
  });

  return savedMappings;
};

/**
 * Gets role permissions for a role.
 * @param {string} companyId - Tenant ID.
 * @param {string} roleId - Role ID.
 * @returns {Promise<Array>} List of mapped permissions populated with permission details.
 */
export const getRolePermissions = async (companyId, roleId) => {
  const role = await Role.findById(roleId);
  if (!role) throw new Error('Role not found.');
  if (companyId && role.companyId && role.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  return await RolePermission.find({ companyId, roleId }).populate('permissionId');
};

/**
 * Gets ALL roles with their permissions for a company.
 * @param {string} companyId - Tenant ID.
 * @returns {Promise<Array>} All roles with permissions.
 */
export const getAllRolesWithPermissions = async (companyId) => {
  // 1. Saare custom roles lo (excluding Company Admin)
  const roles = await Role.find({ companyId, roleName: { $ne: 'Company Admin' } });

  // 2. Har role ki permissions lo
  const result = await Promise.all(
    roles.map(async (role) => {
      const rolePermissions = await RolePermission.find({
        companyId,
        roleId: role._id
      }).populate('permissionId', 'permissionKey module action');

      const permissions = rolePermissions
        .filter((rp) => rp.permissionId != null)
        .map((rp) => ({
          _id:           rp.permissionId._id,
          permissionKey: rp.permissionId.permissionKey,
          module:        rp.permissionId.module,
          action:        rp.permissionId.action,
        }));

      return {
        _id:             role._id,
        roleName:        role.roleName,
        description:     role.description,
        totalPermissions: permissions.length,
        permissions,
      };
    })
  );

  return result;
};
