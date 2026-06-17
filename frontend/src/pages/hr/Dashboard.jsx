import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';
import { FiUsers, FiFolder, FiCalendar, FiBriefcase } from 'react-icons/fi';

const HRDashboard = () => {
  const [counts, setCounts] = useState({ employees: 0, departments: 0, holidays: 0 });
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState(null);

  useEffect(() => {
    const fetchHRData = async () => {
      try {
        const [empRes, deptRes, holRes, compRes] = await Promise.allSettled([
          axiosClient.get('/employees/list?limit=1'),
          axiosClient.get('/departments'),
          axiosClient.get(`/holidays?year=${new Date().getFullYear()}`),
          axiosClient.get('/companies'),
        ]);

        const data = { employees: 0, departments: 0, holidays: 0 };
        if (empRes.status === 'fulfilled') {
          data.employees = empRes.value.data.pagination?.total || empRes.value.data.data?.length || 0;
        }
        if (deptRes.status === 'fulfilled') {
          data.departments = deptRes.value.data.data?.length || 0;
        }
        if (holRes.status === 'fulfilled') {
          data.holidays = holRes.value.data.data?.length || 0;
        }
        if (compRes.status === 'fulfilled') {
          setCompanyInfo(compRes.value.data.data);
        }

        setCounts(data);
      } catch (err) {
        console.error('Failed to load HR dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHRData();
  }, []);

  if (loading) return <Spinner size="lg" />;

  const statCards = [
    { label: 'Total Employee Count', value: counts.employees, icon: FiUsers, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Departments', value: counts.departments, icon: FiFolder, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Company Holidays', value: counts.holidays, icon: FiCalendar, color: 'text-rose-700 bg-rose-50' },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header card */}
      <div className="bg-white rounded-3xl border border-slate-100 card-shadow-lg p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">HR Space</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Track staffing details, department registries, and organization events.
          </p>
        </div>
        {companyInfo && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl px-4 py-2 flex items-center gap-2">
            <FiBriefcase className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-indigo-700">{companyInfo.companyName}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

      {/* Grid panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Quick Directories" subtitle="HR access links">
          <div className="flex flex-col gap-3">
            <Link
              to="/hr/employees"
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors font-bold text-slate-700 text-sm"
            >
              <span>Employee Directory</span>
              <span>&rarr;</span>
            </Link>
            <Link
              to="/hr/departments"
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors font-bold text-slate-700 text-sm"
            >
              <span>Department Records</span>
              <span>&rarr;</span>
            </Link>
            <Link
              to="/hr/designations"
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors font-bold text-slate-700 text-sm"
            >
              <span>Designation Listings</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </Card>

        <Card title="Administrative Tasks" subtitle="Update events & calendars">
          <div className="flex flex-col gap-3">
            <Link
              to="/hr/holidays"
              className="flex items-center justify-between p-3.5 bg-indigo-50/30 border border-indigo-100/50 rounded-xl hover:bg-indigo-50/60 transition-colors font-bold text-indigo-750 text-sm"
            >
              <span>Manage Holidays</span>
              <span>&rarr;</span>
            </Link>
            <Link
              to="/hr/audit-logs"
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors font-bold text-slate-700 text-sm"
            >
              <span>View Audit Logs</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HRDashboard;
