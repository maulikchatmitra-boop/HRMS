import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';
import DashboardLayout from '../layouts/DashboardLayout';
import { FiAlertTriangle } from 'react-icons/fi';
import { getRoleCategory, hasPermission, getRoleDashboard } from '../utils/user.utils';

// Route wrapper for authenticated users
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, syncSession } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && syncSession) {
      syncSession();
    }
  }, [location.pathname, isAuthenticated]);

  if (loading) {
    return <Spinner fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Route wrapper for guest users (Login, Forgot/Reset Password)
export const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <Spinner fullPage />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleDashboard(user)} replace />;
  }

  return children;
};

// Route wrapper to enforce specific roles or permissions
export const RoleGuard = ({ children, allowedRoles = [], requirePermission = null, requireSuperAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner fullPage />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin Check
  if (requireSuperAdmin) {
    if (user.isSuperAdmin) {
      return children;
    }
    return <Navigate to={getRoleDashboard(user)} replace />;
  }

  // Standard Role Check
  if (user.isSuperAdmin) {
    // Super admin shouldn't normally see company level portals, redirect to super-admin dashboard
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  // Dynamic Permission Check
  if (requirePermission) {
    if (hasPermission(user, requirePermission)) {
      return children;
    }
    return <AccessDenied requiredPermission={requirePermission} />;
  }

  const roleName = user.role?.roleName;
  const category = getRoleCategory(roleName);
  if (allowedRoles.includes(category)) {
    return children;
  }

  // Fallback to access denied if role not allowed
  return <AccessDenied requiredPermission={`${allowedRoles.join(', ')} Role`} />;
};

export const AccessDenied = ({ requiredPermission }) => {
  const { refreshPermissions } = useAuth();
  const [checking, setChecking] = React.useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    await refreshPermissions();
    setChecking(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl card-shadow p-8 text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-3xl shadow-sm">
          <FiAlertTriangle />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Access Denied</h3>
          <p className="text-slate-400 text-xs font-semibold mt-2 leading-relaxed">
            You do not have the required permission <code className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-rose-600 font-bold text-[10px]">{requiredPermission}</code> to access this page.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full border-t border-slate-100 pt-5">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checking ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : null}
            <span>{checking ? 'Checking...' : 'Check Again'}</span>
          </button>
          <p className="text-[10px] text-slate-400 font-medium">
            Please ask your company administrator to enable this permission for your role under the Roles & Permissions panel, then click "Check Again" above.
          </p>
        </div>
      </div>
    </div>
  );
};
