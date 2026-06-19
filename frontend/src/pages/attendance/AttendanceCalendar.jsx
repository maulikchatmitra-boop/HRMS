import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getRoleCategory } from '../../utils/user.utils';

const AttendanceCalendar = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [calendarData, setCalendarData] = useState({ leaves: [], holidays: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed

  // Scope: 'team' (default for employees/managers) or 'all' (HR/Admin option)
  const isHR = getRoleCategory(user?.role?.roleName) === 'Company Admin' || getRoleCategory(user?.role?.roleName) === 'HR';
  const [scope, setScope] = useState(isHR ? 'all' : 'team');

  const getLocalDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchCalendarAndLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = getLocalDateString(new Date(year, month, 0));
      
      const logsPromise = axiosClient.get(`/attendance/my-logs?startDate=${firstDay}&endDate=${lastDay}`);
      const calPromise = axiosClient.get(`/leave/calendar?year=${year}&month=${month}&scope=${scope}`);
      
      const [logsRes, calRes] = await Promise.all([logsPromise, calPromise]);
      
      setLogs(logsRes.data.data || []);
      setCalendarData(calRes.data.data || { leaves: [], holidays: [] });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarAndLogs();
  }, [currentDate, scope]);

  // Calendar grid calculations
  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const totalDays = new Date(year, month, 0).getDate(); // last day of month

  const blanks = Array.from({ length: firstDayIndex }, (_, i) => null);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to color code calendar cells
  const getStatusBadgeClass = (status) => {
    const styles = {
      checked_in: 'bg-blue-50 border-blue-200 text-blue-700',
      present: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      half_day: 'bg-amber-50 border-amber-200 text-amber-700',
      absent: 'bg-rose-50 border-rose-200 text-rose-700',
      missed_punch: 'bg-orange-50 border-orange-200 text-orange-700',
      pending_regularization: 'bg-purple-50 border-purple-200 text-purple-700',
      leave: 'bg-slate-100 border-slate-200 text-slate-600',
      holiday: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      week_off: 'bg-teal-50 border-teal-200 text-teal-700',
      not_joined: 'bg-slate-50 border-slate-100 text-slate-350',
    };
    return styles[status] || 'bg-slate-50 border-slate-100 text-slate-400';
  };

  const getStatusLabel = (status) => {
    const labels = {
      checked_in: 'Checked In',
      present: 'Present',
      half_day: 'Half Day',
      absent: 'Absent',
      missed_punch: 'Missed Punch',
      pending_regularization: 'Correction',
      leave: 'Leave',
      holiday: 'Holiday',
      week_off: 'Week Off',
      not_joined: '-',
    };
    return labels[status] || status;
  };

  const getRecordForDay = (day) => {
    if (!day) return null;
    const targetStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return logs.find(l => l.attendanceDate === targetStr);
  };

  const getLeaveColorClass = (code) => {
    const uppercaseCode = code ? code.toUpperCase() : 'OTHER';
    if (uppercaseCode === 'SL') return 'bg-indigo-50 border-indigo-100 text-indigo-700'; // Sick
    if (uppercaseCode === 'CL') return 'bg-emerald-50 border-emerald-100 text-emerald-700'; // Casual
    if (uppercaseCode === 'EL') return 'bg-amber-50 border-amber-100 text-amber-700'; // Earned
    if (uppercaseCode === 'LOP') return 'bg-rose-50 border-rose-100 text-rose-700'; // Loss of Pay
    return 'bg-violet-50 border-violet-100 text-violet-700'; // Default/Other
  };

  const getLeaveDotColorClass = (code) => {
    const uppercaseCode = code ? code.toUpperCase() : 'OTHER';
    if (uppercaseCode === 'SL') return 'bg-indigo-500';
    if (uppercaseCode === 'CL') return 'bg-emerald-500';
    if (uppercaseCode === 'EL') return 'bg-amber-500';
    if (uppercaseCode === 'LOP') return 'bg-rose-500';
    return 'bg-violet-500';
  };

  const getUTCDateString = (isoStr) => {
    if (!isoStr) return '';
    return isoStr.split('T')[0];
  };

  // Helper to check if a specific day has holidays or active leaves
  const getEventsForDay = (day) => {
    if (!day) return { dayHolidays: [], dayLeaves: [] };
    const cellDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Find holidays on this date
    const dayHolidays = (calendarData?.holidays || []).filter((h) => {
      return getUTCDateString(h.date) === cellDateStr;
    });

    // Find approved leaves overlapping this date
    const dayLeaves = (calendarData?.leaves || []).filter((l) => {
      const fromDateStr = getUTCDateString(l.fromDate);
      const toDateStr = getUTCDateString(l.toDate);
      const isOverlapping = cellDateStr >= fromDateStr && cellDateStr <= toDateStr;
      if (!isOverlapping) return false;

      // Exclude weekends for other team members' leaves
      const dateObj = new Date(cellDateStr);
      const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;

      // Exclude public holidays
      const isHoliday = dayHolidays.length > 0;
      if (isHoliday) return false;

      return true;
    });

    return { dayHolidays, dayLeaves };
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col gap-8">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Attendance & Leave Calendar</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Visual month grid of your daily working statuses, public holidays, and team leaves
          </p>
        </div>

        {/* Date Navigation & Filters */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
          {isHR && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setScope('all')}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                  scope === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All Scope
              </button>
              <button
                onClick={() => setScope('team')}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                  scope === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Team Only
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 card-shadow-sm">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} icon={FiChevronLeft} />
            <div className="px-4 text-sm font-bold text-slate-700 min-w-[120px] text-center">
              {monthNames[month - 1]} {year}
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth} icon={FiChevronRight} />
            <div className="h-6 w-[1px] bg-slate-100 mx-1"></div>
            <Button variant="secondary" size="sm" onClick={handleToday}>
              Today
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-4 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Calendar Card */}
      <Card className="!p-0 overflow-hidden border border-slate-100 shadow-xl bg-white rounded-3xl">
        {/* Header grid representing weekdays */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {weekdays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-black text-slate-500 uppercase tracking-wider border-r border-slate-100 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 relative min-h-[450px]">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
              <span className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            </div>
          )}

          {calendarCells.map((day, idx) => {
            const record = getRecordForDay(day);
            const { dayHolidays, dayLeaves } = getEventsForDay(day);
            const isToday =
              day &&
              new Date().getDate() === day &&
              new Date().getMonth() === currentDate.getMonth() &&
              new Date().getFullYear() === year;

            return (
              <div
                key={idx}
                className={`min-h-[110px] md:min-h-[135px] p-2 border-r border-b border-slate-100 last:border-r-0 flex flex-col gap-1.5 transition-colors ${
                  day ? 'bg-white' : 'bg-slate-50/50'
                } ${isToday ? 'bg-indigo-50/15' : ''}`}
              >
                {day && (
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-black rounded-lg w-6 h-6 flex items-center justify-center transition-colors ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150'
                          : 'text-slate-400 hover:text-slate-800'
                      }`}
                    >
                      {day}
                    </span>

                    {/* Render my attendance status badge at the top right */}
                    {record && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${getStatusBadgeClass(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    )}
                  </div>
                )}

                {day && (
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[85px] pr-0.5 custom-scrollbar">
                    {/* Render My Timings */}
                    {record && record.checkInTime && (
                      <div className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 text-[8px] font-bold rounded truncate text-center select-none">
                        In: {new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {record.checkOutTime && ` | Out: ${new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    )}

                    {/* Render Holidays */}
                    {dayHolidays.map((h, i) => (
                      <div
                        key={i}
                        title={`${h.name}${h.description ? `: ${h.description}` : ''}`}
                        className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[8px] font-bold rounded truncate flex items-center gap-1 select-none"
                      >
                        <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0"></span>
                        <span className="truncate">{h.name}</span>
                      </div>
                    ))}

                    {/* Render Team Approved Leaves */}
                    {dayLeaves.map((l, i) => {
                      const isOwn = l.employeeId === user?._id;
                      if (isOwn && (!record || record.status === 'leave')) return null;
                      return (
                        <div
                          key={i}
                          title={`${isOwn ? 'My Leave' : l.employeeName} - ${l.leaveTypeId?.name} (${l.totalDays} day(s))`}
                          className={`px-1.5 py-0.5 border text-[8px] font-black rounded truncate flex items-center gap-1 transition-all ${
                            isOwn 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold ring-1 ring-indigo-55'
                              : getLeaveColorClass(l.leaveTypeId?.code)
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full shrink-0 ${isOwn ? 'bg-indigo-600' : getLeaveDotColorClass(l.leaveTypeId?.code)}`}></span>
                          <span className="truncate">{isOwn ? 'My Leave' : l.employeeName}</span>
                          <span className="text-[7px] opacity-80 shrink-0 uppercase">
                            ({l.leaveTypeId?.code || 'LV'})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend Card */}
      <Card title="Calendar Legend" subtitle="Guide to daily status & leave indicators">
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">My Attendance Statuses</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-center">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">Present</div>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">Half Day</div>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">Absent</div>
              <div className="p-2 rounded-xl bg-orange-50 text-orange-700 text-xs font-bold border border-orange-100">Missed Punch</div>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">Correction</div>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100">Week Off</div>
            </div>
          </div>
          <hr className="border-slate-100" />
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Holidays & Team Approved Leaves</span>
            <div className="flex flex-wrap gap-4 items-center text-xs text-slate-500 font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span>Public Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span>Sick Leave (SL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Casual Leave (CL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Earned Leave (EL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Loss of Pay (LOP)</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AttendanceCalendar;
