import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Spinner from '../../components/Spinner';
import { FiBriefcase, FiUsers, FiCheckCircle, FiActivity } from 'react-icons/fi';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axiosClient.get('/super-admin/stats');
        setStats(res.data.data);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Spinner fullPage={false} size="lg" />;

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
        {error}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Companies',
      value: stats?.totalCompanies ?? 0,
      icon: FiBriefcase,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Active Companies',
      value: stats?.activeCompanies ?? 0,
      icon: FiCheckCircle,
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: FiUsers,
      color: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Platform Activity',
      value: 'Good',
      icon: FiActivity,
      color: 'bg-rose-50 text-rose-700',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Platform Overview</h2>
        <p className="text-slate-400 text-xs mt-1 font-semibold">
          High level insights into companies and user accounts
        </p>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex items-center justify-between transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md"
            >
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-2xl font-black text-slate-800 mt-2">{card.value}</p>
              </div>
              <div className={`p-3.5 rounded-xl ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Plans Distribution & Extra info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Subscription Plans Distribution" subtitle="Active business subscription breakups">
          <div className="flex flex-col gap-4">
            {stats?.plansDistribution ? (
              Object.entries(stats.plansDistribution).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                    {plan} Plan
                  </span>
                  <div className="flex items-center gap-4 flex-1 max-w-xs justify-end">
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{
                          width: `${
                            stats.totalCompanies > 0
                              ? (count / stats.totalCompanies) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-700 min-w-[20px] text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No plan data available</p>
            )}
          </div>
        </Card>

        <Card title="Recent Notifications" subtitle="Administrative audit logs and announcements">
          <div className="flex flex-col gap-4 py-2">
            <div className="flex gap-4">
              <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Platform operational</p>
                <p className="text-xs text-slate-400 mt-0.5">All database systems and cron backups running smoothly.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5" />
              <div>
                <p className="text-sm font-semibold text-slate-700">CORS domain validated</p>
                <p className="text-xs text-slate-400 mt-0.5">Frontend Origin set to http://localhost:3000.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
