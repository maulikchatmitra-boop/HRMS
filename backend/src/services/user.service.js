import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import { hashPassword } from '../utils/auth.utils.js';
import { logAction } from './auditLog.service.js';
import Department from '../models/department.model.js';
import Designation from '../models/designation.model.js';
import Branch from '../models/branch.model.js';
import Shift from '../models/shift.model.js';
import EmployeeType from '../models/employee-type.model.js';
import WorkLocation from '../models/work-location.model.js';
import { formatCleanUser } from '../utils/user.utils.js';

/**
 * Creates a new user in the company.
 * @param {string} companyId - Tenant ID.
 * @param {Object} userData - User creation parameters.
 * @param {string} actorId - Acting user performing creation.
 * @returns {Promise<Object>} Created user document.
 */
export const createUser = async (companyId, userData, actorId) => {
  // 1. Run all validations concurrently with Promise.all
  const checks = [
    User.findOne({ companyId, email: userData.email.toLowerCase() }),
    Role.findOne({ _id: userData.roleId, companyId }),
    userData.departmentId     ? Department.findOne({ _id: userData.departmentId,     companyId, isDeleted: false }) : Promise.resolve(true),
    userData.designationId    ? Designation.findOne({ _id: userData.designationId,   companyId, isDeleted: false }) : Promise.resolve(true),
    userData.reportingManagerId ? User.findOne({ _id: userData.reportingManagerId,   companyId })                  : Promise.resolve(true),
    userData.branchId         ? Branch.findOne({ _id: userData.branchId,             companyId, isDeleted: false }) : Promise.resolve(true),
    userData.shiftId          ? Shift.findOne({ _id: userData.shiftId,               companyId, isDeleted: false }) : Promise.resolve(true),
    userData.employeeTypeId   ? EmployeeType.findOne({ _id: userData.employeeTypeId, companyId, isDeleted: false }) : Promise.resolve(true),
    userData.workLocationId   ? WorkLocation.findOne({ _id: userData.workLocationId, companyId, isDeleted: false }) : Promise.resolve(true),
    hashPassword(userData.password),
  ];

  const [
    existingUser, role,
    dep, des, mgr, br, sh, et, wl,
    passwordHash
  ] = await Promise.all(checks);

  if (existingUser) throw new Error('A user with this email address already exists in your company.');
  if (!role)        throw new Error('The specified role does not exist in your company.');
  if (userData.departmentId     && !dep) throw new Error('The specified department does not exist in your company.');
  if (userData.designationId    && !des) throw new Error('The specified designation does not exist in your company.');
  if (userData.reportingManagerId && !mgr) throw new Error('The specified reporting manager does not exist in your company.');
  if (userData.branchId         && !br)  throw new Error('The specified branch does not exist in your company.');
  if (userData.shiftId          && !sh)  throw new Error('The specified shift does not exist in your company.');
  if (userData.employeeTypeId   && !et)  throw new Error('The specified employee type does not exist in your company.');
  if (userData.workLocationId   && !wl)  throw new Error('The specified work location does not exist in your company.');

  // 2. Create user
  const user = new User({
    companyId,
    firstName: userData.firstName,
    lastName:  userData.lastName,
    email:     userData.email.toLowerCase(),
    password:  passwordHash,
    roleId:    userData.roleId,
    status:    userData.status || 'active',
    departmentId:       userData.departmentId       || null,
    designationId:      userData.designationId      || null,
    reportingManagerId: userData.reportingManagerId || null,
    branchId:           userData.branchId           || null,
    shiftId:            userData.shiftId            || null,
    employeeTypeId:     userData.employeeTypeId     || null,
    workLocationId:     userData.workLocationId     || null,
    createdBy: actorId,
    updatedBy: actorId
  });

  const savedUser = await user.save();

  const cleanSavedUser = savedUser.toObject();
  delete cleanSavedUser.password;
  await logAction({
    companyId,
    userId: actorId,
    module: 'user',
    action: 'create',
    newData: cleanSavedUser
  });

  // Fetch fully populated user to format
  const fullyPopulatedUser = await getUserById(companyId, savedUser._id);
  return fullyPopulatedUser;
};

/**
 * Gets a user by ID within a company.
 * @param {string} companyId - Tenant ID.
 * @param {string} userId - User ID to query.
 * @returns {Promise<Object>} User document.
 */
export const getUserById = async (companyId, userId) => {
  const user = await User.findById(userId)
    .populate('roleId', 'roleName')
    .populate('departmentId', 'name')
    .populate('designationId', 'title')
    .populate('reportingManagerId', 'firstName lastName email')
    .populate('branchId', 'name')
    .populate('shiftId', 'name startTime endTime')
    .populate('employeeTypeId', 'name')
    .populate('workLocationId', 'name')
    .select('-password');
  
  if (!user) {
    throw new Error('User not found.');
  }
  if (companyId && user.companyId && user.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  return formatCleanUser(user);
};

export const getUsers = async (companyId, filter = {}) => {
  const page  = parseInt(filter.page,  10) || 1;
  const limit = parseInt(filter.limit, 10) || 50;
  const skip  = (page - 1) * limit;

  const query = { companyId };

  // Exclude Company Admin from employee list
  // Use roleName in query to avoid extra DB round-trip
  const adminRole = await Role.findOne({ companyId, roleName: 'Company Admin' })
    .select('_id').lean();
  if (adminRole) {
    query.roleId = { $ne: adminRole._id };
  }

  if (filter.search) {
    query.$or = [
      { firstName: { $regex: filter.search, $options: 'i' } },
      { lastName:  { $regex: filter.search, $options: 'i' } },
      { email:     { $regex: filter.search, $options: 'i' } }
    ];
  }

  const allowedFilters = ['status', 'roleId', 'departmentId', 'designationId', 'branchId', 'shiftId', 'employeeTypeId', 'workLocationId'];
  allowedFilters.forEach(field => { if (filter[field]) query[field] = filter[field]; });

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .populate('roleId', 'roleName')
      .populate('departmentId', 'name')
      .populate('designationId', 'title')
      .populate('reportingManagerId', 'firstName lastName email')
      .populate('branchId', 'name')
      .populate('shiftId', 'name startTime endTime')
      .populate('employeeTypeId', 'name')
      .populate('workLocationId', 'name')
      .select('-password')
      .skip(skip)
      .limit(limit)
  ]);

  return {
    users: users.map(formatCleanUser),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  };
};

/**
 * Updates a user in the company.
 * @param {string} companyId - Tenant ID.
 * @param {string} userId - User ID to update.
 * @param {Object} updateData - Updatable fields.
 * @param {string} actorId - Acting user performing the update.
 * @returns {Promise<Object>} Updated user document.
 */
export const updateUser = async (companyId, userId, updateData, actorId) => {
  const oldUser = await User.findById(userId);
  if (!oldUser) {
    throw new Error('User not found.');
  }
  if (companyId && oldUser.companyId && oldUser.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }

  // Validate email changes uniqueness if provided
  if (updateData.email && updateData.email.toLowerCase() !== oldUser.email) {
    const emailCheck = await User.findOne({ companyId, email: updateData.email.toLowerCase() });
    if (emailCheck) {
      throw new Error('A user with this email address already exists in your company.');
    }
  }

  // Validate role existence if updating roleId
  if (updateData.roleId && updateData.roleId !== oldUser.roleId.toString()) {
    const role = await Role.findOne({ _id: updateData.roleId, companyId });
    if (!role) {
      throw new Error('The specified role does not exist in your company.');
    }
  }

  // Validate reference fields if provided
  if (updateData.departmentId) {
    const dep = await Department.findOne({ _id: updateData.departmentId, companyId, isDeleted: false });
    if (!dep) throw new Error('The specified department does not exist in your company.');
  }
  if (updateData.designationId) {
    const des = await Designation.findOne({ _id: updateData.designationId, companyId, isDeleted: false });
    if (!des) throw new Error('The specified designation does not exist in your company.');
  }
  if (updateData.reportingManagerId) {
    if (updateData.reportingManagerId === userId) {
      throw new Error('An employee cannot be their own reporting manager.');
    }
    const mgr = await User.findOne({ _id: updateData.reportingManagerId, companyId });
    if (!mgr) throw new Error('The specified reporting manager does not exist in your company.');
  }
  if (updateData.branchId) {
    const br = await Branch.findOne({ _id: updateData.branchId, companyId, isDeleted: false });
    if (!br) throw new Error('The specified branch does not exist in your company.');
  }
  if (updateData.shiftId) {
    const sh = await Shift.findOne({ _id: updateData.shiftId, companyId, isDeleted: false });
    if (!sh) throw new Error('The specified shift does not exist in your company.');
  }
  if (updateData.employeeTypeId) {
    const et = await EmployeeType.findOne({ _id: updateData.employeeTypeId, companyId, isDeleted: false });
    if (!et) throw new Error('The specified employee type does not exist in your company.');
  }
  if (updateData.workLocationId) {
    const wl = await WorkLocation.findOne({ _id: updateData.workLocationId, companyId, isDeleted: false });
    if (!wl) throw new Error('The specified work location does not exist in your company.');
  }

  const allowedUpdates = [
    'firstName', 'lastName', 'email', 'roleId', 'status',
    'departmentId', 'designationId', 'reportingManagerId',
    'branchId', 'shiftId', 'employeeTypeId', 'workLocationId'
  ];
  const actualUpdates = {
    updatedBy: actorId
  };

  if (updateData.password) {
    actualUpdates.password = await hashPassword(updateData.password);
  }

  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      if (key === 'email') {
        actualUpdates[key] = updateData[key].toLowerCase();
      } else {
        actualUpdates[key] = updateData[key];
      }
    }
  });

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId },
    { $set: actualUpdates },
    { new: true, runValidators: true }
  ).select('-password');

  await logAction({
    companyId,
    userId: actorId,
    module: 'user',
    action: 'update',
    oldData: oldUser.toObject(),
    newData: updatedUser.toObject()
  });

  // Fetch fully populated updated user to format
  const fullyPopulatedUpdatedUser = await getUserById(companyId, updatedUser._id);
  return fullyPopulatedUpdatedUser;
};

/**
 * Deletes a user (soft delete/suspend for HRMS safety or hard delete if requested).
 * We implement a hard delete but safety check that the admin doesn't delete themselves.
 * @param {string} companyId - Tenant ID.
 * @param {string} userId - User ID to delete.
 * @param {string} actorId - Acting user performing delete.
 * @returns {Promise<Object>} Deleted user document.
 */
export const deleteUser = async (companyId, userId, actorId) => {
  if (userId === actorId) {
    throw new Error('You cannot delete your own user account.');
  }

  const oldUser = await User.findById(userId);
  if (!oldUser) {
    throw new Error('User not found.');
  }
  if (companyId && oldUser.companyId && oldUser.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }

  const deletedUser = await User.findOneAndDelete({ _id: userId });

  await logAction({
    companyId,
    userId: actorId,
    module: 'user',
    action: 'delete',
    oldData: oldUser.toObject(),
    newData: null
  });

  return formatCleanUser(deletedUser);
};

/**
 * Terminate a user — sets status to inactive (soft termination).
 * Business logic moved from controller to service layer.
 * @param {string} companyId
 * @param {string} userId - Employee to terminate
 * @param {string} actorId - Who is performing the action
 */
export const terminateUser = async (companyId, userId, actorId) => {
  if (userId.toString() === actorId.toString()) {
    throw new Error('You cannot terminate your own account.');
  }

  const employee = await User.findById(userId);
  if (!employee) throw new Error('Employee not found.');
  if (companyId && employee.companyId && employee.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  if (employee.status === 'inactive') throw new Error('Employee is already inactive/terminated.');

  const oldData = employee.toObject();

  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { status: 'inactive', updatedBy: actorId },
    { new: true }
  )
    .populate('roleId', 'roleName')
    .populate('departmentId', 'name')
    .populate('designationId', 'title')
    .populate('reportingManagerId', 'firstName lastName email')
    .populate('branchId', 'name')
    .populate('shiftId', 'name startTime endTime')
    .populate('employeeTypeId', 'name')
    .populate('workLocationId', 'name')
    .select('-password');

  const cleanEmployee = formatCleanUser(updated);

  await logAction({
    companyId, userId: actorId,
    module: 'employee', action: 'terminate',
    oldData, newData: cleanEmployee
  });

  return cleanEmployee;
};
