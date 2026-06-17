import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { FiClock, FiLock, FiLogOut } from 'react-icons/fi';
import Button from '../components/Button';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();

  // Skip blocker for Super Admin (they manage the platform)
  const isSuperAdmin = user?.isSuperAdmin;

  // Check company status and subscription status
  const isCompanyInactive = user && !isSuperAdmin && user.companyStatus === 'inactive';
  const isCompanyExpired = user && !isSuperAdmin && user.companySubscriptionStatus === 'expired';

  if (isCompanyInactive || isCompanyExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white border border-slate-100 rounded-3xl card-shadow p-8 md:p-12 text-center flex flex-col items-center gap-6">
          {/* Animated Icon Container */}
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-md animate-bounce ${
            isCompanyInactive 
              ? 'bg-rose-50 text-rose-500' 
              : 'bg-amber-50 text-amber-500'
          }`}>
            {isCompanyInactive ? <FiLock /> : <FiClock />}
          </div>
          
          <div>
            <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${
              isCompanyInactive 
                ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              {isCompanyInactive ? 'Account Suspended' : 'Subscription Expired'}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              {isCompanyInactive 
                ? 'Your organization is inactive' 
                : 'Your subscription has expired'}
            </h2>
            <p className="text-slate-400 text-sm font-semibold mt-3 leading-relaxed max-w-md mx-auto">
              {isCompanyInactive 
                ? 'Access to this workspace has been temporarily suspended by the platform administrator. Please contact your organization administrator or HR representative.' 
                : 'Access to this workspace is currently locked because your subscription plan has expired. To resume operations, please contact your organization administrator to renew your plan.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full border-t border-slate-100 pt-6 mt-2 max-w-md">
            <Button 
              variant="outline" 
              className="w-full justify-center !py-3 font-bold text-sm tracking-wide"
              icon={FiLogOut}
              onClick={logout}
            >
              Sign Out from Account
            </Button>
            <p className="text-[10px] text-slate-400 font-medium">
              If you think this is an error, please reach out to the system Super Admin at support@hrms.com.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar - fixed left */}
      <Sidebar />

      {/* Main panel - offset by sidebar */}
      <div className="pl-64 min-h-screen flex flex-col">
        {/* Top Navbar */}
        <Navbar />

        {/* Dynamic page contents container */}
        <main className="flex-1 pt-16 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
