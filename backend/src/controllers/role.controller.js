import * as roleService from '../services/role.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

/**
 * Creates a new role in the company.
 */
export const createRole = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const savedRole = await roleService.createRole(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(savedRole),
      message: 'Role created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets all roles inside the active tenant.
 * Role filter by requester's role
 */
export const getRoles = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    // Requester ka role name pass karo
    const requesterRole = req.user.roleName || null;
    const roles = await roleService.getRoles(companyId, requesterRole);
    return res.status(200).json({
      success: true,
      data: roles.map(formatCleanMeta),
      message: 'Roles list retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a role inside the active tenant.
 */
export const updateRole = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const updatedRole = await roleService.updateRole(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(updatedRole),
      message: 'Role updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a role from the active tenant.
 */
export const deleteRole = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const deletedRole = await roleService.deleteRole(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(deletedRole),
      message: 'Role deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Maps permissions to a specific role. Replaces all previous permission mappings.
 */
export const assignPermissionsToRole = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params; // roleId
    const { permissionIds } = req.body;
    const mappings = await roleService.assignPermissionsToRole(companyId, id, permissionIds, userId);
    return res.status(200).json({
      success: true,
      data: mappings.map(formatCleanMeta),
      message: 'Role permissions updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets all permissions assigned to a role.
 */
export const getRolePermissions = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params; // roleId
    const mappings = await roleService.getRolePermissions(companyId, id);
    return res.status(200).json({
      success: true,
      data: mappings.map(formatCleanMeta),
      message: 'Role permissions retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets ALL roles with their permissions in one response.
 */
export const getAllRolesWithPermissions = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await roleService.getAllRolesWithPermissions(companyId);
    return res.status(200).json({
      success: true,
      data,
      message: 'All roles with permissions retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};
