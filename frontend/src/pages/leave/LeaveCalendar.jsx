import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, getRoleCategory } from '../../utils/user.utils';

const LeaveCalendar = () => {
  const { user } = useAuth();
  const [calendarData, setCalendarData] = useState({ leaves: [], holidays: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed (Jan=1, Dec=12)

  // Scope: 'team' (default for employees/managers) or 'all' (HR/Admin option)
  const isHR = getRoleCategory(user?.role?.roleName) === 'Company Admin' || getRoleCategory(user?.role?.roleName) === 'HR';
  const [scope, setScope] = useState(isHR ? 'all' : 'team');

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/leave/calendar?year=${year}&month=${month}&scope=${scope}`);
      setCalendarData(res.data.data || { leaves: [], holidays: [] });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, scope]);

  // Calendar calculations
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

  // Helper to color-code leaves based on codes
  const getLeaveColorClass = (code) => {
    const uppercaseCode = code ? code.toUpperCase() : 'OTHER';
    if (uppercaseCode === 'SL') return 'bg-indigo-50 border-indigo-150 text-indigo-700 hover:bg-indigo-100'; // Sick
    if (uppercaseCode === 'CL') return 'bg-emerald-50 border-emerald-150 text-emerald-700 hover:bg-emerald-100'; // Casual
    if (uppercaseCode === 'EL') return 'bg-amber-50 border-amber-150 text-amber-700 hover:bg-amber-100'; // Earned
    if (uppercaseCode === 'LOP') return 'bg-rose-50 border-rose-150 text-rose-700 hover:bg-rose-100'; // Loss of Pay
    return 'bg-violet-50 border-violet-150 text-violet-700 hover:bg-violet-100'; // Default/Other
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

    // Find leaves overlapping this date
    const dayLeaves = (calendarData?.leaves || []).filter((l) => {
      const fromDateStr = getUTCDateString(l.fromDate);
      const toDateStr = getUTCDateString(l.toDate);
      const isOverlapping = cellDateStr >= fromDateStr && cellDateStr <= toDateStr;
      if (!isOverlapping) return false;

      // Exclude weekends
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
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Leave Calendar</h2>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Monthly view of approved company leaves, team occurrences, and public holidays
          </p>
        </div>

        {/* Filters and Navigation */}
        <div className="flex flex-wrap items-center gap-3 md:self-end">
          {isHR && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                  scope === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                All Scope
              </button>
              <button
                onClick={() => setScope('team')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                  scope === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Team Only
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-xl">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} className="!p-1.5 border-none bg-transparent">
              <FiChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-black text-slate-700 uppercase tracking-wide px-2">
              {monthNames[month - 1]} {year}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextMonth} className="!p-1.5 border-none bg-transparent">
              <FiChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleToday} className="py-2.5">
            Today
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      {/* Calendar Card container */}
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
            const { dayHolidays, dayLeaves } = getEventsForDay(day);
            const isToday =
              day &&
              new Date().getDate() === day &&
              new Date().getMonth() === currentDate.getMonth() &&
              new Date().getFullYear() === year;

            return (
              <div
                key={idx}
                className={`min-h-[100px] p-2 border-r border-b border-slate-100 last:border-r-0 flex flex-col gap-1.5 transition-colors ${
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
                  </div>
                )}

                {day && (
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[85px] pr-0.5 custom-scrollbar">
                    {/* Render Holidays */}
                    {dayHolidays.map((h, i) => (
                      <div
                        key={i}
                        title={`${h.name}${h.description ? `: ${h.description}` : ''}`}
                        className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg truncate flex items-center gap-1.5 select-none"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                        <span className="truncate">{h.name}</span>
                      </div>
                    ))}

                    {/* Render Approved Leaves */}
                    {dayLeaves.map((l, i) => {
                      const isOwn = l.employeeId === user?._id;
                      return (
                        <div
                          key={i}
                          title={`${isOwn ? 'My Leave' : l.employeeName} - ${l.leaveTypeId?.name} (${l.totalDays} day(s))`}
                          className={`px-2 py-1 border text-[10px] font-black rounded-lg truncate flex items-center gap-1.5 shadow-2xs transition-all ${getLeaveColorClass(
                            l.leaveTypeId?.code
                          )}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getLeaveDotColorClass(l.leaveTypeId?.code)}`}></span>
                          {!isOwn && <span className="truncate">{l.employeeName}</span>}
                          <span className="text-[8px] opacity-85 uppercase font-bold">
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

      {/* Color Legend */}
      <Card className="!p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between text-xs text-slate-500 font-semibold">
          <div className="flex items-center gap-1">
            <FiCalendar />
            <span>Calendar Legend:</span>
          </div>

          <div className="flex flex-wrap gap-3">
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
      </Card>
    </div>
  );
};

export default LeaveCalendar;
