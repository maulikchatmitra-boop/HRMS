import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';
import { FiUsers, FiBriefcase, FiGrid } from 'react-icons/fi';

const ManagerDashboard = () => {
  const [counts, setCounts] = useState({ teamSize: 0 });
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const [empRes, compRes] = await Promise.allSettled([
          axiosClient.get('/employees/list?limit=1'),
          axiosClient.get('/companies'),
        ]);

        const data = { teamSize: 0 };
        if (empRes.status === 'fulfilled') {
          data.teamSize = empRes.value.data.pagination?.total || empRes.value.data.data?.length || 0;
        }
        if (compRes.status === 'fulfilled') {
          setCompanyInfo(compRes.value.data.data);
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
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enterprise Group</span>
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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enterprise Status</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-emerald-50 text-emerald-700 mt-2">
              {companyInfo?.status || 'active'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700">
            <FiBriefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card title="Management Directory" subtitle="Quick access pathways">
            <div className="grid grid-cols-1 gap-4">
              <Link
                to="/manager/employees"
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/55 transition-colors font-bold text-slate-700 text-sm"
              >
                <span className="flex items-center gap-2">
                  <FiGrid className="w-4 h-4 text-indigo-600" />
                  <span>View Team Members</span>
                </span>
                <span>&rarr;</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
