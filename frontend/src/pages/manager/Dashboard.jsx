import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';
import { FiUsers, FiBriefcase, FiGrid, FiCalendar } from 'react-icons/fi';

const ManagerDashboard = () => {
  const [counts, setCounts] = useState({ teamSize: 0 });
  const [companyInfo, setCompanyInfo] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const [empRes, compRes, holRes] = await Promise.allSettled([
          axiosClient.get('/employees/list?limit=1'),
          axiosClient.get('/companies'),
          axiosClient.get(`/holidays?year=${new Date().getFullYear()}`),
        ]);

        const data = { teamSize: 0 };
        if (empRes.status === 'fulfilled') {
          data.teamSize = empRes.value.data.data?.pagination?.total || empRes.value.data.data?.users?.length || 0;
        }
        if (compRes.status === 'fulfilled') {
          setCompanyInfo(compRes.value.data.data);
        }
        if (holRes.status === 'fulfilled') {
          setHolidays(holRes.value.data.data || []);
        }

        setCounts(data);
      } catch (err) {
        console.error('Failed to load manager dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchManagerData();
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
      {/* Title block */}
      <div className="bg-white rounded-3xl border border-slate-100 card-shadow-lg p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Manager Dashboard</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Oversee team tasks, shifts, and member details
          </p>
        </div>
        {companyInfo && (
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Organization</span>
            <span className="text-sm font-black text-slate-700 mt-0.5">{companyInfo.companyName}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workspace Staff</p>
            <p className="text-2xl font-black text-slate-800 mt-2">{counts.teamSize}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50 text-indigo-600">
            <FiUsers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Status</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-emerald-50 text-emerald-700 mt-2">
              {companyInfo?.status || 'active'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700">
            <FiBriefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
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
                      {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
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

export default ManagerDashboard;
