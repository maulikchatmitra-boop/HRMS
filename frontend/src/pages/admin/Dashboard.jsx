import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';
import { FiUsers, FiFolder, FiMapPin, FiCalendar, FiClock } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { formatDateDisplay } from '../../utils/user.utils';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    employees: 0,
    departments: 0,
    branches: 0,
    holidays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [empRes, deptRes, branchRes, holRes, compRes] = await Promise.allSettled([
          axiosClient.get('/employees/list?limit=1'),
          axiosClient.get('/departments'),
          axiosClient.get('/branches'),
          axiosClient.get(`/holidays?year=${new Date().getFullYear()}`),
          axiosClient.get('/companies'),
        ]);

        const data = { employees: 0, departments: 0, branches: 0, holidays: 0 };

        if (empRes.status === 'fulfilled') {
          data.employees = empRes.value.data.data?.pagination?.total || empRes.value.data.data?.users?.length || 0;
        }
        if (deptRes.status === 'fulfilled') {
          data.departments = deptRes.value.data.pagination?.total || deptRes.value.data.data?.length || 0;
        }
        if (branchRes.status === 'fulfilled') {
          data.branches = branchRes.value.data.data?.length || 0;
        }
        if (holRes.status === 'fulfilled') {
          const holData = holRes.value.data.data || [];
          setHolidays(holData);
          data.holidays = holData.length;
        }
        if (compRes.status === 'fulfilled') {
          setCompanyInfo(compRes.value.data.data);
        }

        setCounts(data);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <Spinner size="lg" />;

  const statCards = [
    { label: 'Total Employees', value: counts.employees, icon: FiUsers, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Departments', value: counts.departments, icon: FiFolder, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Operating Branches', value: counts.branches, icon: FiMapPin, color: 'text-amber-700 bg-amber-50' },
    { label: 'Upcoming Holidays', value: counts.holidays, icon: FiCalendar, color: 'text-rose-700 bg-rose-50' },
  ];

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
      {/* Welcome banner */}
      <div className="bg-white rounded-3xl border border-slate-100 card-shadow-lg p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Hello, Company Admin!
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Here is what's happening at {companyInfo?.companyName || 'your organization'} today.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md"
            >
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className="text-2xl font-black text-slate-800 mt-2">{c.value}</p>
              </div>
              <div className={`p-3.5 rounded-xl ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card title="Quick Management shortcuts" subtitle="Administrative actions">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/admin/employees"
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/55 transition-colors font-bold text-slate-700 text-sm"
              >
                <span>Add & Modify Employees</span>
                <span className="w-6 h-6 rounded-full bg-white text-indigo-600 border border-slate-100 flex items-center justify-center font-bold text-lg">&rarr;</span>
              </Link>
              <Link
                to="/admin/roles"
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/55 transition-colors font-bold text-slate-700 text-sm"
              >
                <span>Roles & System Access</span>
                <span className="w-6 h-6 rounded-full bg-white text-indigo-600 border border-slate-100 flex items-center justify-center font-bold text-lg">&rarr;</span>
              </Link>
              <Link
                to="/admin/departments"
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/55 transition-colors font-bold text-slate-700 text-sm"
              >
                <span>Manage Departments</span>
                <span className="w-6 h-6 rounded-full bg-white text-indigo-600 border border-slate-100 flex items-center justify-center font-bold text-lg">&rarr;</span>
              </Link>
              <Link
                to="/admin/holidays"
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/55 transition-colors font-bold text-slate-700 text-sm"
              >
                <span>Holiday Calendar</span>
                <span className="w-6 h-6 rounded-full bg-white text-indigo-600 border border-slate-100 flex items-center justify-center font-bold text-lg">&rarr;</span>
              </Link>
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

        {/* Company Settings overview */}
        <Card title="Organization Info" subtitle="Profile overview">
          <div className="flex flex-col gap-4 text-xs font-semibold">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Company Email</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{companyInfo?.email || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Admin Email</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{user?.email || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Billing Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 mt-1 text-[10px] uppercase tracking-wider">
                {companyInfo?.subscriptionStatus || 'active'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Current Plan</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 mt-1 text-[10px] uppercase tracking-wider">
                {companyInfo?.plan || 'basic'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
