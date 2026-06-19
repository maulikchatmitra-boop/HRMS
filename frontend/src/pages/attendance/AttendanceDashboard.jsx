import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import { FiUsers, FiClock, FiCheckSquare, FiAlertCircle, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/user.utils';

const AttendanceDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canApprove = hasPermission(user, 'attendance.approve') || hasPermission(user, 'attendance.manage');

  const getLocalDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const todayStr = getLocalDateString(new Date());

      // 1. Fetch dashboard metrics
      const metricsRes = await axiosClient.get('/attendance/dashboard-metrics');
      setMetrics(metricsRes.data.data || null);

      // 2. Fetch team logs for today only if manager/admin
      if (canApprove) {
        const logsRes = await axiosClient.get(`/attendance/team-logs?startDate=${todayStr}&endDate=${todayStr}`);
        setTodayLogs(logsRes.data.data || []);
      } else {
        setTodayLogs([]);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const columns = [
    {
      header: 'Employee',
      key: 'employeeId',
      render: (val) => (
        <span className="font-bold text-slate-800">
          {val ? `${val.firstName} ${val.lastName}` : 'Employee'}
        </span>
      ),
    },
    {
      header: 'Check In',
      key: 'checkInTime',
      render: (val) => (val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'),
    },
    {
      header: 'Check Out',
      key: 'checkOutTime',
      render: (val) => (val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'),
    },
    {
      header: 'Shift',
      key: 'shiftName',
      render: (val) => <span className="font-semibold text-slate-500">{val || '-'}</span>,
    },
    {
      header: 'Late Minutes',
      key: 'lateMinutes',
      render: (val) => (val > 0 ? <span className="text-amber-600 font-bold">{val}m</span> : '-'),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => {
        const styles = {
          checked_in: 'bg-blue-50 text-blue-600 border-blue-100',
          present: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          half_day: 'bg-amber-50 text-amber-600 border-amber-100',
          absent: 'bg-rose-50 text-rose-600 border-rose-100',
          missed_punch: 'bg-orange-50 text-orange-600 border-orange-100',
          pending_regularization: 'bg-purple-50 text-purple-600 border-purple-100',
          not_joined: 'bg-slate-50 text-slate-400 border-slate-100',
        };
        const labels = {
          checked_in: 'Checked In',
          present: 'Present',
          half_day: 'Half Day',
          absent: 'Absent',
          missed_punch: 'Missed Punch',
          pending_regularization: 'Correction Pending',
          not_joined: '-',
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[val] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
            {labels[val] || val}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Attendance Dashboard</h2>
        <p className="text-slate-400 text-xs mt-1 font-semibold">
          Today's operational metrics and active employee check-ins
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-4 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <span className="w-10 h-10 border-4 border-t-transparent border-indigo-600 rounded-full animate-spin"></span>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Checked In */}
              <div className="bg-white border border-slate-100 card-shadow-sm rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <FiUsers className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800">{metrics.employeesCheckedIn}</span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Checked In Today</p>
                </div>
              </div>

              {/* Checked Out */}
              <div className="bg-white border border-slate-100 card-shadow-sm rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                  <FiCheckSquare className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800">{metrics.employeesCheckedOut}</span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Checked Out Today</p>
                </div>
              </div>

              {/* Late Arrivals */}
              <div className="bg-white border border-slate-100 card-shadow-sm rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <FiClock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800">{metrics.lateArrivalsToday}</span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Late Arrivals Today</p>
                </div>
              </div>

              {/* Pending Corrections */}
              <div className="bg-white border border-slate-100 card-shadow-sm rounded-2xl p-5 flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <FiAlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-800">{metrics.pendingRegularizations}</span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pending Corrections</p>
                </div>
              </div>
            </div>
          )}

          {/* Today's Stats Details */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-center">
                <span className="text-3xl font-black text-emerald-600">{metrics.presentToday}</span>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">Present Today</p>
              </div>
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 text-center">
                <span className="text-3xl font-black text-amber-600">{metrics.halfDayToday}</span>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">Half Day Today</p>
              </div>
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 text-center">
                <span className="text-3xl font-black text-rose-600">{metrics.absentToday}</span>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1.5">Absent Today</p>
              </div>
            </div>
          )}

          {/* Active Employees List */}
          {canApprove && (
            <Card title="Today's Logs Activity" subtitle="Real-time employee check-in logs for today">
              <Table
                columns={columns}
                data={todayLogs}
                loading={loading}
                emptyMessage="No active check-ins or logs tracked for today yet."
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceDashboard;
