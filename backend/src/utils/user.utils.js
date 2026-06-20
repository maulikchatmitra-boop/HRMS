/**
 * Formats a raw database user document into a clean, modern JSON response
 * for client applications, stripping sensitive credentials and unwanted database fields.
 * @param {Object} user - The populated user/employee document.
 * @returns {Object|null}
 */
export const formatCleanUser = (user) => {
  if (!user) return null;
  const u = user.toObject ? user.toObject() : user;

  return {
    _id:         u._id,
    firstName:   u.firstName,
    lastName:    u.lastName,
    email:       u.email,
    phone:       u.phone       || null,
    address:     u.address     || null,
    city:        u.city        || null,
    avatar:      u.avatar      || null,
    joiningDate: u.joiningDate || null,
    dateOfBirth: u.dateOfBirth || null,
    isSuperAdmin: !!u.isSuperAdmin,
    status:      u.status,
    lastLogin:   u.lastLogin,
    companyId:   u.companyId   || null,
    role: u.roleId ? {
      _id:      u.roleId._id      || u.roleId,
      roleName: u.roleId.roleName || ''
    } : null,
    department: u.departmentId ? {
      _id:  u.departmentId._id  || u.departmentId,
      name: u.departmentId.name || ''
    } : null,
    designation: u.designationId ? {
      _id:   u.designationId._id   || u.designationId,
      title: u.designationId.title || ''
    } : null,
    reportingManager: u.reportingManagerId ? {
      _id:       u.reportingManagerId._id       || u.reportingManagerId,
      firstName: u.reportingManagerId.firstName || '',
      lastName:  u.reportingManagerId.lastName  || '',
      email:     u.reportingManagerId.email     || ''
    } : null,
    branch: u.branchId ? {
      _id:  u.branchId._id  || u.branchId,
      name: u.branchId.name || ''
    } : null,
    shift: u.shiftId ? {
      _id:       u.shiftId._id       || u.shiftId,
      name:      u.shiftId.name      || '',
      startTime: u.shiftId.startTime || '',
      endTime:   u.shiftId.endTime   || ''
    } : null,
    employeeType: u.employeeTypeId ? {
      _id:  u.employeeTypeId._id  || u.employeeTypeId,
      name: u.employeeTypeId.name || ''
    } : null,
    workLocation: u.workLocationId ? {
      _id:  u.workLocationId._id  || u.workLocationId,
      name: u.workLocationId.name || ''
    } : null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  };
};

/**
 * Strips MongoDB versioning and soft-delete parameters from data model responses.
 * @param {Object} doc - Document object.
 * @returns {Object|null}
 */
export const formatCleanMeta = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  
  delete obj.__v;
  delete obj.isDeleted;
  delete obj.deletedAt;
  delete obj.deletedBy;
  
  return obj;
};

/**
 * Classifies custom role names into standard category codes.
 * @param {string} roleName
 * @returns {string} One of 'Company Admin', 'HR', 'Manager', 'Employee'
 */
export const getRoleCategory = (roleName) => {
  if (!roleName) return 'Employee';
  const name = roleName.toLowerCase();
  if (name.includes('admin')) return 'Company Admin';
  if (name.includes('hr')) return 'HR';
  if (name.includes('manager') || name.includes('leader') || name.includes('lead')) return 'Manager';
  return 'Employee';
};

