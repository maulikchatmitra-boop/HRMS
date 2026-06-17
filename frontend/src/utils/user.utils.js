export const getRoleCategory = (roleName) => {
  if (!roleName) return 'Employee';
  const name = roleName.toLowerCase();
  if (name.includes('admin')) return 'Company Admin';
  if (name.includes('hr')) return 'HR';
  if (name.includes('manager') || name.includes('leader') || name.includes('lead')) return 'Manager';
  return 'Employee';
};

export const hasPermission = (user, permissionKey) => {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const category = getRoleCategory(user.role?.roleName);
  if (category === 'Company Admin') return true;
  return user.permissions?.includes(permissionKey) || false;
};

export const getRoleDashboard = (user) => {
  if (user.isSuperAdmin) return '/super-admin/dashboard';
  const category = getRoleCategory(user.role?.roleName);
  if (category === 'Company Admin') return '/admin/dashboard';
  if (category === 'HR') return '/hr/dashboard';
  if (category === 'Manager') return '/manager/dashboard';
  if (category === 'Employee') return '/employee/dashboard';
  return '/login';
};

export const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  const hourString = hour < 10 ? '0' + hour : hour;
  return `${hourString}:${minute} ${ampm}`;
};
