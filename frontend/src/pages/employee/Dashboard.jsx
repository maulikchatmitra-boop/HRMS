import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';
import { FiClock, FiMapPin, FiBriefcase, FiUser, FiCalendar } from 'react-icons/fi';
import { formatTime12h, formatDateDisplay } from '../../utils/user.utils';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [companyInfo, setCompanyInfo] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const [compRes, holRes] = await Promise.allSettled([
          axiosClient.get('/companies'),
          axiosClient.get(`/holidays?year=${new Date().getFullYear()}`),
        ]);
        if (compRes.status === 'fulfilled') {
          setCompanyInfo(compRes.value.data.data);
        }
        if (holRes.status === 'fulfilled') {
          setHolidays(holRes.value.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load employee dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeeData();
  }, []);

  if (loading) return <Spinner size="lg" />;

  const getUpcomingHolidays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidays
      .filter((h) => new Date(h.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  };

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
        <div className="lg:col-span-2 flex flex-col gap-8">
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

          <Card title="Upcoming Holidays" subtitle="Upcoming calendar events">
            {getUpcomingHolidays().length === 0 ? (
              <p className="text-sm font-semibold text-slate-500 py-3">No upcoming holidays scheduled.</p>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                {getUpcomingHolidays().map((h, idx) => (
                  <div
                    key={h._id || idx}
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/55 transition-colors font-semibold text-slate-700 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                        <FiCalendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{h.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{h.description || 'Public Holiday'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-white border border-slate-100 px-2.5 py-1 rounded-xl shadow-sm">
                      {`${new Date(h.date).toLocaleDateString(undefined, { weekday: 'short' })}, ${formatDateDisplay(h.date)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Organization Info" subtitle="Profile overview">
          <div className="flex flex-col gap-4 text-xs font-semibold">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Company Name</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{companyInfo?.companyName || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Company Email</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{companyInfo?.email || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Company Phone</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{companyInfo?.phone || '-'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
