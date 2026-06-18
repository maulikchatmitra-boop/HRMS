import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  ProtectedRoute,
  GuestRoute,
  RoleGuard,
} from './components/RouteGuards';
import { getRoleDashboard } from './utils/user.utils';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';

// Super Admin Pages
import SuperAdminDashboard from './pages/super-admin/Dashboard';
import SuperAdminCompanies from './pages/super-admin/Companies';
import SuperAdminLogin from './pages/super-admin/Login';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminEmployees from './pages/admin/Employees';
import AdminDepartments from './pages/admin/Departments';
import AdminDesignations from './pages/admin/Designations';
import AdminBranches from './pages/admin/Branches';
import AdminShifts from './pages/admin/Shifts';
import AdminHolidays from './pages/admin/Holidays';
import AdminRoles from './pages/admin/Roles';
import AdminAuditLogs from './pages/admin/AuditLogs';

// HR Pages
import HRDashboard from './pages/hr/Dashboard';

// Manager Pages
import ManagerDashboard from './pages/manager/Dashboard';
import ManagerEmployees from './pages/manager/Employees';

// Employee Pages
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeHolidays from './pages/employee/Holidays';

// Leave Pages
import LeaveTypes from './pages/leave/LeaveTypes';
import LeavePolicies from './pages/leave/LeavePolicies';
import LeaveBalances from './pages/leave/LeaveBalances';
import LeaveRequests from './pages/leave/LeaveRequests';
import LeaveCalendar from './pages/leave/LeaveCalendar';
import Documents from './pages/Documents';

// Helper component to redirect root "/" to the appropriate dashboard
const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user) {
    return <Navigate to={getRoleDashboard(user)} replace />;
  }
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Guest Routes */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/system/login"
            element={
              <GuestRoute>
                <SuperAdminLogin />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <ResetPassword />
              </GuestRoute>
            }
          />

          {/* Root redirect */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Common Protected Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Routes */}
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute>
                <RoleGuard requireSuperAdmin={true}>
                  <SuperAdminDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/companies"
            element={
              <ProtectedRoute>
                <RoleGuard requireSuperAdmin={true}>
                  <SuperAdminCompanies />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Company Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Company Admin']}>
                  <AdminDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="employee.view">
                  <AdminEmployees />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="department.view">
                  <AdminDepartments />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/designations"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="designation.view">
                  <AdminDesignations />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/branches"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="branch.view">
                  <AdminBranches />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/shifts"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="shift.view">
                  <AdminShifts />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/holidays"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="holiday.view">
                  <AdminHolidays />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="role.view">
                  <AdminRoles />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="audit.view">
                  <AdminAuditLogs />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* HR Routes */}
          <Route
            path="/hr/dashboard"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['HR']}>
                  <HRDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/employees"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="employee.view">
                  <AdminEmployees />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/departments"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="department.view">
                  <AdminDepartments />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/designations"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="designation.view">
                  <AdminDesignations />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/holidays"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="holiday.view">
                  <AdminHolidays />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/audit-logs"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="audit.view">
                  <AdminAuditLogs />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Manager Routes */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Manager']}>
                  <ManagerDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/employees"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="employee.view">
                  <ManagerEmployees />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Employee Routes */}
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Employee']}>
                  <EmployeeDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/holidays"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="holiday.view">
                  <EmployeeHolidays />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Leave Management Routes */}
          <Route
            path="/leave/types"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="leaveType.view">
                  <LeaveTypes />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave/policies"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="leavePolicy.view">
                  <LeavePolicies />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave/balances"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="leaveBalance.view">
                  <LeaveBalances />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave/requests"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="leave.viewOwn">
                  <LeaveRequests />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave/calendar"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="leaveCalendar.view">
                  <LeaveCalendar />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Document Management Routes */}
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <RoleGuard requirePermission="document.view">
                  <Documents />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Fallback to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
