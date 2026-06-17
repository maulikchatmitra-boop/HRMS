import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';
import { FiClock, FiMapPin, FiBriefcase, FiUser } from 'react-icons/fi';
import { formatTime12h } from '../../utils/user.utils';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const res = await axiosClient.get('/companies');
        setCompanyInfo(res.data.data);
      } catch (err) {
        console.error('Failed to load company info for employee:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyInfo();
  }, []);

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome header */}
      <div className="bg-white rounded-3xl border border-slate-100 card-shadow-lg p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Welcome, {user?.firstName}!
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Track your personal shift timing and branch directory here.
          </p>
        </div>
        {companyInfo && (
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Employer Code</span>
            <span className="text-sm font-black text-slate-700 block mt-0.5">{companyInfo.companyCode}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Work schedule details */}
        <Card title="Shift Schedule Details" subtitle="Your active daily timings">
          <div className="flex items-center gap-5 py-2">
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
              <FiClock className="w-6 h-6" />
            </div>
            <div>
              {user?.shift ? (
                <>
                  <p className="text-base font-bold text-slate-800">{user.shift.name}</p>
                  <p className="text-sm font-semibold text-slate-500 mt-1">
                    Daily Timings: {formatTime12h(user.shift.startTime)} &ndash; {formatTime12h(user.shift.endTime)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-slate-500">No shift hours assigned yet.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Workspace location details */}
        <Card title="Workspace Location" subtitle="Registered office details">
          <div className="flex items-center gap-5 py-2">
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700">
              <FiMapPin className="w-6 h-6" />
            </div>
            <div>
              {user?.branch ? (
                <>
                  <p className="text-base font-bold text-slate-800">{user.branch.name}</p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Physical Office Location</p>
                </>
              ) : (
                <p className="text-sm font-semibold text-slate-500">No office branch assigned.</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Profile details preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card title="Designation Details" subtitle="Employment hierarchy">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                  <FiUser className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Role</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{user?.role?.roleName || 'Employee'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                  <FiBriefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Department</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{user?.department?.name || 'Not Assigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                  <FiBriefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Designation</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{user?.designation?.title || 'Not Assigned'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Corporate Group" subtitle="Business registration details">
          <div className="flex flex-col gap-4 text-xs font-semibold">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Company Name</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{companyInfo?.companyName || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Company Code</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block font-mono">{companyInfo?.companyCode || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Service Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 mt-1 text-[10px] uppercase tracking-wider">
                {companyInfo?.status || 'active'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
