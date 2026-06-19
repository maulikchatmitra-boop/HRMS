import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleCategory, hasPermission, getRoleDashboard } from '../utils/user.utils';
import {
  FiGrid,
  FiBriefcase,
  FiUsers,
  FiFolder,
  FiAward,
  FiMapPin,
  FiClock,
  FiCalendar,
  FiShield,
  FiList,
  FiUser,
  FiLogOut,
  FiSettings,
  FiChevronDown,
  FiChevronUp,
  FiFileText,
} from 'react-icons/fi';

const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getLinks = () => {
    if (user.isSuperAdmin) {
      return [
        { path: '/super-admin/dashboard', label: 'Dashboard', icon: FiGrid },
        { path: '/super-admin/companies', label: 'Companies', icon: FiBriefcase },
      ];
    }

    const role = user.role?.roleName;
    const category = getRoleCategory(role);
    if (category === 'Company Admin') {
      const links = [
        { path: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
        { path: '/admin/employees', label: 'Employees', icon: FiUsers, permission: 'employee.view' },
        { path: '/admin/holidays', label: 'Holidays', icon: FiCalendar, permission: 'holiday.view' },
        { path: '/admin/roles', label: 'Roles & Permissions', icon: FiShield, permission: 'role.view' },
        { path: '/admin/audit-logs', label: 'Audit Logs', icon: FiList, permission: 'audit.view' },
        { path: '/documents', label: 'Documents', icon: FiFileText, permission: 'document.view' },
      ];
      return links.filter(link => !link.permission || hasPermission(user, link.permission));
    }

    // Dynamic link resolution for HR, Manager, Employee, and any custom role
    const links = [];

    // 1. Dashboard
    if (category === 'HR') {
      links.push({ path: '/hr/dashboard', label: 'Dashboard', icon: FiGrid });
    } else if (category === 'Manager') {
      links.push({ path: '/manager/dashboard', label: 'Dashboard', icon: FiGrid });
    } else {
      links.push({ path: '/employee/dashboard', label: 'Dashboard', icon: FiGrid });
    }

    // 2. Employees (registry)
    if (hasPermission(user, 'employee.view')) {
      if (category === 'Manager') {
        links.push({ path: '/manager/employees', label: 'My Team', icon: FiUsers });
      } else {
        links.push({ path: '/hr/employees', label: 'Employees', icon: FiUsers });
      }
    }

    // 5. Holidays
    if (hasPermission(user, 'holiday.view')) {
      if (category === 'Employee') {
        links.push({ path: '/employee/holidays', label: 'Holidays', icon: FiCalendar });
      } else {
        links.push({ path: '/hr/holidays', label: 'Holidays', icon: FiCalendar });
      }
    }

    // 6. Audit Logs
    if (hasPermission(user, 'audit.view')) {
      links.push({ path: '/hr/audit-logs', label: 'Audit Logs', icon: FiList });
    }

    // 7. Documents
    if (hasPermission(user, 'document.view')) {
      links.push({ path: '/documents', label: 'Documents', icon: FiFileText });
    }

    return links;
  };

  const getStructureSetupLinks = () => {
    const links = [];
    const prefix = getRoleCategory(user.role?.roleName) === 'Company Admin' ? '/admin' : '/hr';

    if (hasPermission(user, 'department.view')) {
      links.push({ path: `${prefix}/departments`, label: 'Departments', icon: FiFolder });
    }
    if (hasPermission(user, 'designation.view')) {
      links.push({ path: `${prefix}/designations`, label: 'Designations', icon: FiAward });
    }
    return links;
  };

  const getBranchShiftLinks = () => {
    const links = [];
    if (hasPermission(user, 'branch.view')) {
      links.push({ path: '/admin/branches', label: 'Branches', icon: FiMapPin });
    }
    if (hasPermission(user, 'shift.view')) {
      links.push({ path: '/admin/shifts', label: 'Shifts', icon: FiClock });
    }
    return links;
  };

  const getAttendanceLinks = () => {
    const links = [];
    if (hasPermission(user, 'attendance.view')) {
      links.push({ path: '/attendance/my-attendance', label: 'My Attendance', icon: FiUser });
      links.push({ path: '/attendance/calendar', label: 'Attendance & Leave Calendar', icon: FiCalendar });
    }
    if (hasPermission(user, 'attendance.regularize') || hasPermission(user, 'attendance.approve')) {
      links.push({ path: '/attendance/regularizations', label: 'Regularization Requests', icon: FiFileText });
    }
    if (hasPermission(user, 'attendance.manage')) {
      links.push({ path: '/attendance/reports', label: 'Attendance Reports', icon: FiList });
      links.push({ path: '/attendance/monthly-summary', label: 'Monthly Summary', icon: FiGrid });
    }
    return links;
  };

  const getLeaveLinks = () => {
    const links = [];
    if (hasPermission(user, 'leaveType.view')) {
      links.push({ path: '/leave/types', label: 'Leave Types', icon: FiGrid });
    }
    if (hasPermission(user, 'leavePolicy.view')) {
      links.push({ path: '/leave/policies', label: 'Leave Policies', icon: FiBriefcase });
    }
    if (hasPermission(user, 'leaveBalance.view')) {
      links.push({ path: '/leave/balances', label: 'Leave Balances', icon: FiClock });
    }
    if (hasPermission(user, 'leave.viewOwn')) {
      links.push({ path: '/leave/requests', label: 'Leave Requests', icon: FiList });
    }
    return links;
  };

  const location = useLocation();
  const [leaveMenuOpen, setLeaveMenuOpen] = useState(location.pathname.startsWith('/leave'));
  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(location.pathname.startsWith('/attendance'));
  const [branchShiftMenuOpen, setBranchShiftMenuOpen] = useState(
    location.pathname.startsWith('/admin/branches') || location.pathname.startsWith('/admin/shifts')
  );
  const [structureSetupMenuOpen, setStructureSetupMenuOpen] = useState(
    location.pathname.includes('/departments') || location.pathname.includes('/designations')
  );

  useEffect(() => {
    if (location.pathname.startsWith('/leave')) {
      setLeaveMenuOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/attendance')) {
      setAttendanceMenuOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/admin/branches') || location.pathname.startsWith('/admin/shifts')) {
      setBranchShiftMenuOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.includes('/departments') || location.pathname.includes('/designations')) {
      setStructureSetupMenuOpen(true);
    }
  }, [location.pathname]);

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen fixed left-0 top-0 z-20">
      {/* Brand logo */}
      <Link
        to={getRoleDashboard(user)}
        className="h-16 px-6 border-b border-slate-100 flex items-center gap-3 hover:bg-slate-50/50 transition-colors duration-150"
      >
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-150">
          H
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase">HRMS System</h1>
          <p className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase">Enterprise</p>
        </div>
      </Link>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {getLinks().map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}

        {getStructureSetupLinks().length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setStructureSetupMenuOpen(!structureSetupMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FiFolder className="w-4 h-4 text-slate-500" />
                <span>Organization</span>
              </div>
              {structureSetupMenuOpen ? <FiChevronUp className="w-4 h-4 text-slate-400" /> : <FiChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {structureSetupMenuOpen && (
              <div className="pl-4 mt-1 space-y-1 border-l border-slate-100 ml-6">
                {getStructureSetupLinks().map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600 shadow-xs font-bold'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {getBranchShiftLinks().length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setBranchShiftMenuOpen(!branchShiftMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FiMapPin className="w-4 h-4 text-slate-500" />
                <span>Branch & Shift</span>
              </div>
              {branchShiftMenuOpen ? <FiChevronUp className="w-4 h-4 text-slate-400" /> : <FiChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {branchShiftMenuOpen && (
              <div className="pl-4 mt-1 space-y-1 border-l border-slate-100 ml-6">
                {getBranchShiftLinks().map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600 shadow-xs font-bold'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {getLeaveLinks().length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setLeaveMenuOpen(!leaveMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FiCalendar className="w-4 h-4 text-slate-500" />
                <span>Leave Management</span>
              </div>
              {leaveMenuOpen ? <FiChevronUp className="w-4 h-4 text-slate-400" /> : <FiChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {leaveMenuOpen && (
              <div className="pl-4 mt-1 space-y-1 border-l border-slate-100 ml-6">
                {getLeaveLinks().map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600 shadow-xs font-bold'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {getAttendanceLinks().length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setAttendanceMenuOpen(!attendanceMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FiClock className="w-4 h-4 text-slate-500" />
                <span>Attendance</span>
              </div>
              {attendanceMenuOpen ? <FiChevronUp className="w-4 h-4 text-slate-400" /> : <FiChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {attendanceMenuOpen && (
              <div className="pl-4 mt-1 space-y-1 border-l border-slate-100 ml-6">
                {getAttendanceLinks().map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600 shadow-xs font-bold'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-slate-100">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            <FiUser className="w-4 h-4" />
            <span>My Profile</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-all duration-200"
        >
          <FiLogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
