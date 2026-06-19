import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/user.utils';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';

const MonthlyAttendanceSummary = () => {
  const { user } = useAuth();
  
  // Date and filter defaults
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Filters State
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));
  const [departmentId, setDepartmentId] = useState('');
  const [searchName, setSearchName] = useState('');

  // Dropdown lists
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState([]);

  const isAuthorized = hasPermission(user, 'attendance.manage');

  // Fetch departments list
  const fetchDepartments = async () => {
    try {
      const res = await axiosClient.get('/departments');
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  // Fetch monthly report data
  const fetchSummaryReport = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/attendance/company-monthly-summary?year=${year}&month=${month}`;
      if (departmentId) {
        url += `&departmentId=${departmentId}`;
      }
      if (searchName.trim()) {
        url += `&search=${encodeURIComponent(searchName.trim())}`;
      }

      const res = await axiosClient.get(url);
      setSummaryData(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setYear(String(currentYear));
    setMonth(String(currentMonth));
    setDepartmentId('');
    setSearchName('');
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchDepartments();
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchSummaryReport();
    }
  }, [year, month, departmentId]);

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center">
        <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-6 max-w-md mx-auto font-black shadow-sm">
          Access Denied: You do not have permissions to view the Monthly Attendance Summary.
        </div>
      </div>
    );
  }

  // Months map
  const monthNames = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Years range
  const yearsList = [
    String(currentYear - 2),
    String(currentYear - 1),
    String(currentYear),
    String(currentYear + 1),
  ];

  const columns = [
    {
      header: 'Employee',
      key: 'employee',
      render: (val) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-extrabold text-slate-855 text-sm tracking-tight">{val.name}</span>
          <span className="text-[10px] text-slate-400 font-black tracking-wide uppercase">{val.department}</span>
        </div>
      ),
    },
    {
      header: 'Working Days',
      key: 'workingDays',
      render: (val) => <span className="font-extrabold text-slate-700 text-xs">{val} Days</span>,
    },
    {
      header: 'Present',
      key: 'present',
      render: (val) => <span className="font-extrabold text-emerald-600 text-xs">{val} Days</span>,
    },
    {
      header: 'Half Days',
      key: 'halfDays',
      render: (val) => <span className="font-extrabold text-amber-500 text-xs">{val} Days</span>,
    },
    {
      header: 'Absent',
      key: 'absent',
      render: (val) => <span className="font-extrabold text-slate-800 text-xs">{val} Days</span>,
    },
    {
      header: 'Leave Days',
      key: 'leaveDays',
      render: (val) => <span className="font-extrabold text-indigo-600 text-xs">{val} Days</span>,
    },
    {
      header: 'Late Days',
      key: 'lateDays',
      render: (val) => <span className="font-extrabold text-orange-500 text-xs">{val} Days</span>,
    },
    {
      header: 'Overtime',
      key: 'overtime',
      render: (val) => <span className="font-bold text-slate-450 text-xs">{val}</span>,
    },
    {
      header: 'Attendance %',
      key: 'attendancePercentage',
      render: (val) => {
        const colorClass = val >= 75 ? 'text-emerald-600' : 'text-rose-500';
        return (
          <span className={`font-black text-sm tracking-wide ${colorClass}`}>
            {val}%
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Title block */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Monthly Attendance Summary</h2>
        <p className="text-slate-400 text-xs mt-1 font-semibold">
          Consolidated percentage, hours, and absenteeism stats for all company staff.
        </p>
      </div>

      {/* Query Filters Card */}
      <Card title="Query Summary" subtitle="Select target month, department, or filter by employee name">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-end">
          {/* Year */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-700 outline-hidden hover:border-slate-350 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer shadow-xs"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-700 outline-hidden hover:border-slate-350 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer shadow-xs"
            >
              {monthNames.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-700 outline-hidden hover:border-slate-350 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer shadow-xs"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Employee search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee Name</label>
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FiSearch className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by first/last name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchSummaryReport();
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 outline-hidden focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-650 transition-all duration-200 shadow-xs hover:border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="outline" icon={FiRefreshCw} onClick={handleReset}>
            Reset
          </Button>
          <Button variant="primary" icon={FiSearch} onClick={fetchSummaryReport} loading={loading}>
            Fetch Summary
          </Button>
        </div>
      </Card>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-4 rounded-xl font-bold">
          {error}
        </div>
      )}

      {/* Summary Data Table */}
      <Card className="!p-0 overflow-hidden border border-slate-150 shadow-xl bg-white rounded-3xl">
        <Table
          columns={columns}
          data={summaryData}
          loading={loading}
          emptyMessage="No employee attendance records matching filters."
        />
      </Card>
    </div>
  );
};

export default MonthlyAttendanceSummary;
