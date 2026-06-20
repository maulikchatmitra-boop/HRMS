import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { FiClock, FiPlay, FiSquare, FiAlertTriangle, FiCalendar } from 'react-icons/fi';
import { formatTime12h, formatDateDisplay } from '../../utils/user.utils';

const MyAttendance = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Early Checkout Modal
  const [earlyModalOpen, setEarlyModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [earlyError, setEarlyError] = useState('');
  const [earlyFieldErrors, setEarlyFieldErrors] = useState({});

  // Regularize Modal
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regReason, setRegReason] = useState('');
  const [regError, setRegError] = useState('');
  const [regFieldErrors, setRegFieldErrors] = useState({});

  const openEarlyModal = () => {
    setEarlyError('');
    setEarlyFieldErrors({});
    setReason('');
    setEarlyModalOpen(true);
  };

  const closeEarlyModal = () => {
    setEarlyModalOpen(false);
    setEarlyError('');
    setEarlyFieldErrors({});
    setReason('');
  };

  const openRegModal = () => {
    setRegError('');
    setRegFieldErrors({});
    setRegDate('');
    setRegReason('');
    setRegModalOpen(true);
  };

  const closeRegModal = () => {
    setRegModalOpen(false);
    setRegError('');
    setRegFieldErrors({});
    setRegDate('');
    setRegReason('');
  };

  const hasShift = user && (user.shift || user.shiftId);

  const getAttendanceScore = () => {
    if (!summary) return 0;
    const total = summary.present + summary.halfDay + summary.absent + summary.missedPunch + summary.pendingRegularization;
    if (total === 0) return 0;
    const actual = summary.present + (summary.halfDay * 0.5);
    return Math.round((actual / total) * 100);
  };

  const getPunctualityDetails = () => {
    const validLogs = logs.filter(l => !l.isVirtual && l.checkInTime);
    if (validLogs.length === 0) return { avgIn: '-', totalLate: 0 };
    
    let totalLate = 0;
    let totalInMins = 0;
    let checkInCount = 0;

    validLogs.forEach(l => {
      totalLate += l.lateMinutes || 0;
      const d = new Date(l.checkInTime);
      totalInMins += d.getHours() * 60 + d.getMinutes();
      checkInCount++;
    });

    const avgMins = Math.round(totalInMins / checkInCount);
    const avgHrs = Math.floor(avgMins / 60);
    const avgM = avgMins % 60;
    const ampm = avgHrs >= 12 ? 'PM' : 'AM';
    const dispHrs = avgHrs % 12 || 12;
    const avgInStr = `${String(dispHrs).padStart(2, '0')}:${String(avgM).padStart(2, '0')} ${ampm}`;

    return { avgIn: avgInStr, totalLate };
  };

  const getTodayBreakTime = () => {
    if (!todayRecord || !todayRecord.regularizationReason) return 0;
    const match = todayRecord.regularizationReason.match(/Total Out Time:\s*(\d+)\s*mins/);
    return match ? Number(match[1]) : 0;
  };

  const getAnomalies = () => {
    return logs.filter(log => !log.isVirtual && (log.status === 'missed_punch' || log.status === 'absent'));
  };

  const handleFixAnomaly = (dateStr) => {
    setRegDate(dateStr);
    setRegReason('');
    setRegError('');
    setRegFieldErrors({});
    setRegModalOpen(true);
  };

  const formatLateMinutes = (mins) => {
    if (!mins) return '0 mins';
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}h ${m}m` : `${m} mins`;
  };

  // Real-time clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getLocalDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = getLocalDateString(now);
      
      const res = await axiosClient.get(`/attendance/my-logs?startDate=${firstDay}&endDate=${lastDay}`);
      const list = res.data.data || [];
      setLogs(list);

      // Extract today's record
      const todayStr = getLocalDateString(now);
      const todayLog = list.find((item) => item.attendanceDate === todayStr && !item.isVirtual);
      setTodayRecord(todayLog || null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const now = new Date();
      const res = await axiosClient.get(
        `/attendance/monthly-summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
      );
      setSummary(res.data.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSummary();
  }, []);

  const handleCheckIn = async () => {
    if (!hasShift) return;
    setActionLoading(true);
    setError('');
    try {
      await axiosClient.post('/attendance/check-in');
      fetchLogs();
      fetchSummary();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const executeCheckout = async (earlyReason = '') => {
    setActionLoading(true);
    setError('');
    try {
      await axiosClient.post('/attendance/check-out', { reason: earlyReason });
      closeEarlyModal();
      fetchLogs();
      fetchSummary();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOutClick = () => {
    if (!todayRecord) return;
    
    const expected = new Date(todayRecord.expectedCheckoutTime);
    const toleranceMins = 15; // From settings (default 15)
    const toleranceMs = toleranceMins * 60 * 1000;
    
    // Allow normal checkout if within 15 minutes of expectedCheckoutTime or after it
    if (currentTime.getTime() >= expected.getTime() - toleranceMs) {
      executeCheckout();
    } else {
      openEarlyModal();
    }
  };

  const handleEarlyCheckoutSubmit = (e) => {
    e.preventDefault();
    setEarlyError('');
    setEarlyFieldErrors({});
    if (!reason.trim()) {
      setEarlyFieldErrors({ reason: 'Justification reason is required.' });
      return;
    }
    executeCheckout(reason);
  };

  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegFieldErrors({});

    const errors = {};
    if (!regDate) {
      errors.regDate = 'Attendance date is required.';
    }
    if (!regReason.trim()) {
      errors.regReason = 'Explanation reason is required.';
    }

    if (Object.keys(errors).length > 0) {
      setRegFieldErrors(errors);
      return;
    }

    setActionLoading(true);
    try {
      await axiosClient.post('/attendance/regularize', {
        attendanceDate: regDate,
        regularizationReason: regReason,
      });
      closeRegModal();
      fetchLogs();
      fetchSummary();
    } catch (err) {
      setRegError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Check if checkout button is early
  const isEarlyCheckoutActive = () => {
    if (!todayRecord) return false;
    const expected = new Date(todayRecord.expectedCheckoutTime);
    const toleranceMs = 15 * 60 * 1000;
    return currentTime.getTime() < expected.getTime() - toleranceMs;
  };

  // Generate countdown string to expected checkout
  const getCheckoutCountdown = () => {
    if (!todayRecord) return '';
    const expected = new Date(todayRecord.expectedCheckoutTime);
    const diffMs = expected.getTime() - currentTime.getTime();
    if (diffMs <= 0) return 'Shift completed';
    
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    return `${diffHrs}h ${diffMins}m ${diffSecs}s remaining`;
  };

  const columns = [
    {
      header: 'Date',
      key: 'attendanceDate',
      render: (val, row) => (
        <span className="font-bold text-slate-700">
          {formatDateDisplay(val)}
        </span>
      ),
    },
    {
      header: 'Shift Timing',
      key: 'shiftStartTime',
      render: (val, row) => {
        if (row.isVirtual || !row.shiftStartTime || !row.shiftEndTime) return '-';
        return `${formatTime12h(row.shiftStartTime)} - ${formatTime12h(row.shiftEndTime)}`;
      },
    },
    {
      header: 'First In',
      key: 'checkInTime',
      render: (val) => (val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'),
    },
    {
      header: 'Last Out',
      key: 'checkOutTime',
      render: (val) => (val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'),
    },
    {
      header: 'Working Hours',
      key: 'workingMinutes',
      render: (val, row) => {
        if (row.isVirtual || !row.checkInTime) return '-';
        if (row.status === 'checked_in') return 'In Progress';
        const hrs = Math.floor(val / 60);
        const mins = val % 60;
        return `${hrs}h ${mins}m`;
      },
    },
    {
      header: 'Late Coming',
      key: 'lateMinutes',
      render: (val, row) => {
        if (row.isVirtual || !val) return '-';
        const hrs = Math.floor(val / 60);
        const mins = val % 60;
        return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;
      },
    },
    {
      header: 'Early Exit',
      key: 'earlyExitMinutes',
      render: (val, row) => {
        if (row.isVirtual || !val) return '-';
        const hrs = Math.floor(val / 60);
        const mins = val % 60;
        return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;
      },
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
          leave: 'bg-slate-100 text-slate-600 border-slate-200',
          holiday: 'bg-indigo-50 text-indigo-600 border-indigo-100',
          week_off: 'bg-teal-50 text-teal-600 border-teal-100',
          not_joined: 'bg-slate-50 text-slate-400 border-slate-100',
        };
        const labels = {
          checked_in: 'Checked In',
          present: 'Present',
          half_day: 'Half Day',
          absent: 'Absent',
          missed_punch: 'Missed Punch',
          pending_regularization: 'Pending Regularization',
          leave: 'Leave',
          holiday: 'Holiday',
          week_off: 'Week Off',
          not_joined: '-',
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[val] || 'bg-slate-100 text-slate-600'}`}>
            {labels[val] || val}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">My Attendance</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">Track your daily clock actions and history logs</p>
        </div>
        <div>
          <Button variant="outline" icon={FiCalendar} onClick={() => setRegModalOpen(true)}>
            Request Regularization
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-4 rounded-xl flex items-center gap-3">
          <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Main Grid: Clock Panel + Monthly Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Clock Action Panel */}
        <Card className="lg:col-span-2" title="Clock Actions" subtitle="Check in at start and check out at end of shift">
          {!hasShift && (
            <div className="bg-amber-50 border border-amber-100 text-amber-800 text-sm p-4 rounded-xl flex items-center gap-3 mb-6">
              <FiAlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="font-semibold">Shift not assigned. Please contact HR/Admin.</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4">
            {/* Clock Face Display */}
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
                <FiClock className="w-10 h-10 animate-pulse" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {currentTime.toLocaleDateString([], { weekday: 'long' })}, {formatDateDisplay(currentTime)}
                </div>
              </div>
            </div>

            {/* Check In / Out Buttons */}
            <div className="flex items-center gap-3">
              {todayRecord && (todayRecord.regularizationStatus === 'approved' || todayRecord.regularizationStatus === 'rejected') ? (
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                    todayRecord.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    todayRecord.status === 'half_day' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {todayRecord.status === 'present' ? 'Present' : todayRecord.status === 'half_day' ? 'Half Day' : 'Absent'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Shift Finalized (Locked)
                  </span>
                </div>
              ) : !todayRecord || todayRecord.status !== 'checked_in' ? (
                <div className="flex flex-col items-end gap-1.5">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={FiPlay}
                    disabled={!hasShift}
                    loading={actionLoading}
                    onClick={handleCheckIn}
                  >
                    {todayRecord ? 'Check In Again' : 'Check In'}
                  </Button>
                  {hasShift && user.shift && (
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      Shift: {user.shift.name} ({formatTime12h(user.shift.startTime)} - {formatTime12h(user.shift.endTime)})
                    </span>
                  )}
                  {todayRecord && todayRecord.checkOutTime && (
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-1">
                      Latest Out: {new Date(todayRecord.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  <Button
                    variant={isEarlyCheckoutActive() ? 'warning' : 'success'}
                    size="lg"
                    icon={FiSquare}
                    loading={actionLoading}
                    onClick={handleCheckOutClick}
                  >
                    Check Out
                  </Button>
                  {isEarlyCheckoutActive() && (
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                      Early Check-out: Justification Required
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Shift Details or Checkout Counter */}
          {todayRecord && (
            <div className="mt-6 border-t border-slate-100 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {todayRecord.status === 'checked_in' ? (
                  <>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Expected Checkout</span>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {formatTime12h(todayRecord.shiftEndTime)} ({getCheckoutCountdown()})
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Shift Timing</span>
                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {formatTime12h(todayRecord.shiftStartTime || todayRecord.expectedCheckInTime)} - {formatTime12h(todayRecord.shiftEndTime || todayRecord.expectedCheckoutTime)}
                    </p>
                  </>
                )}
              </div>
              
              {getTodayBreakTime() > 0 && (
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Today's Breaks (Out Time)</span>
                  <p className="text-sm font-bold text-rose-600 mt-1">
                    {getTodayBreakTime()} mins
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Shift</span>
                <p className="text-sm font-bold text-slate-700 mt-1">{todayRecord.shiftName || todayRecord.shift?.name || 'Standard Shift'}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Monthly Summary Statistics */}
        <Card title="Monthly Summary" subtitle="Attendance score & punctuality">
          {summaryLoading ? (
            <div className="h-32 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-t-transparent border-indigo-600 rounded-full animate-spin"></span>
            </div>
          ) : summary ? (
            <div className="flex flex-col gap-5">
              {/* Score and Punctuality Row */}
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                {/* SVG Circular Ring */}
                <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
                    {/* Track */}
                    <circle
                      cx="30"
                      cy="30"
                      r="25"
                      className="text-slate-200"
                      strokeWidth="5"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {/* Progress */}
                    <circle
                      cx="30"
                      cy="30"
                      r="25"
                      className="text-indigo-600 transition-all duration-500 ease-out"
                      strokeWidth="5"
                      strokeDasharray="157"
                      strokeDashoffset={157 - (157 * getAttendanceScore()) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-base font-black text-slate-800">{getAttendanceScore()}%</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Score</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Punctuality</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold">Avg Check-in</span>
                      <span className="text-xs font-black text-slate-700">{getPunctualityDetails().avgIn}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold">Total Late</span>
                      <span className={`text-xs font-black ${getPunctualityDetails().totalLate > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {formatLateMinutes(getPunctualityDetails().totalLate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid of aggregates */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                  <span className="text-base font-black text-emerald-600">{summary.present}</span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Present</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                  <span className="text-base font-black text-amber-600">{summary.halfDay}</span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Half Day</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                  <span className="text-base font-black text-rose-600">{summary.absent}</span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Absent</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                  <span className="text-base font-black text-orange-600">{summary.missed}</span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Missed</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center col-span-2">
                  <span className="text-base font-black text-purple-600">{summary.pendingRegularization}</span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pending Correction</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No summary data found.</p>
          )}
        </Card>
      </div>

      {/* Attention Required / Anomalies Section */}
      {getAnomalies().length > 0 && (
        <Card
          className="border-amber-200 bg-amber-50/30"
          title="Attention Required"
          subtitle="Please regularize your missed punches or absent days to avoid payroll deductions"
        >
          <div className="flex flex-col gap-3">
            {getAnomalies().slice(0, 3).map((anomaly) => (
              <div
                key={anomaly.attendanceDate}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-white border border-slate-100 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                    <FiAlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800">
                      {formatDateDisplay(anomaly.attendanceDate)}
                    </span>
                    <span className={`ml-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      anomaly.status === 'missed_punch'
                        ? 'bg-orange-50 text-orange-600 border-orange-100'
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {anomaly.status === 'missed_punch' ? 'Missed Punch' : 'Absent'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleFixAnomaly(anomaly.attendanceDate)}
                >
                  Regularize
                </Button>
              </div>
            ))}
            {getAnomalies().length > 3 && (
              <p className="text-xs text-slate-400 font-semibold mt-1">
                + {getAnomalies().length - 3} more days require attention
              </p>
            )}
          </div>
        </Card>
      )}

      {/* History Log Table */}
      <Card title="Attendance Logs" subtitle="Your attendance records for the current month">
        <Table columns={columns} data={logs} loading={loading} emptyMessage="No attendance logs found for this period." />
      </Card>

      {/* Early Checkout Modal */}
      {earlyModalOpen && (
        <Modal isOpen={earlyModalOpen} title="Early Check Out Justification" onClose={closeEarlyModal}>
          <form onSubmit={handleEarlyCheckoutSubmit} noValidate className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 font-medium">
              You are checking out before the expected end of shift. Please provide an emergency or early exit explanation to submit your check-out.
            </p>
            {earlyError && <span className="text-xs text-rose-600 font-bold">{earlyError}</span>}
            <Input
              label="Justification Reason"
              type="textarea"
              placeholder="E.g., Doctor appointment, emergency, forgot check-out earlier, system error"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              error={earlyFieldErrors.reason}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="secondary" onClick={closeEarlyModal}>
                Cancel
              </Button>
              <Button type="submit" variant="warning" loading={actionLoading}>
                Submit & Check Out
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Regularization Modal */}
      {regModalOpen && (
        <Modal isOpen={regModalOpen} title="Submit Regularization Request" onClose={closeRegModal}>
          <form onSubmit={handleRegularizeSubmit} noValidate className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 font-medium">
              Request correction for a missed check-in/out or incorrect attendance logs.
            </p>
            {regError && <span className="text-xs text-rose-600 font-bold">{regError}</span>}
            <Input
              label="Attendance Date"
              type="date"
              value={regDate}
              onChange={(e) => setRegDate(e.target.value)}
              required
              error={regFieldErrors.regDate}
            />
            <Input
              label="Explanation Reason"
              type="textarea"
              placeholder="Describe why you need to regularize this day (e.g. forgot check-out, internet issue, system error)"
              value={regReason}
              onChange={(e) => setRegReason(e.target.value)}
              required
              error={regFieldErrors.regReason}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="secondary" onClick={closeRegModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={actionLoading}>
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default MyAttendance;
