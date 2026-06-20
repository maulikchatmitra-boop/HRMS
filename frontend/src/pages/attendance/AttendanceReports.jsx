import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, formatDateDisplay } from '../../utils/user.utils';
import { FiDownload, FiSearch, FiEdit, FiAlertTriangle } from 'react-icons/fi';

const AttendanceReports = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date Range Filters
  const now = new Date();
  const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  
  const getLocalDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const lastDayStr = getLocalDateString(now);

  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(lastDayStr);
  const [search, setSearch] = useState('');

  // Override Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('present');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  const openOverrideModal = () => {
    setFormError('');
    setFieldErrors({});
    setOverrideModalOpen(true);
  };

  const closeOverrideModal = () => {
    setFormError('');
    setFieldErrors({});
    setOverrideModalOpen(false);
    // Reset form fields
    setSelectedEmpId('');
    setOverrideDate('');
    setOverrideStatus('present');
    setCheckInTime('');
    setCheckOutTime('');
    setOverrideReason('');
  };

  const canManage = hasPermission(user, 'attendance.manage');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get(`/attendance/team-logs?startDate=${startDate}&endDate=${endDate}`);
      setLogs(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!canManage) return;
    try {
      const res = await axiosClient.get('/employees/list?limit=200&status=active');
      setEmployees(res.data.data.users || res.data.data.employees || res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchEmployees();
  }, [startDate, endDate]);

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const errors = {};
    if (!selectedEmpId) {
      errors.selectedEmpId = 'Employee selection is required.';
    }
    if (!overrideDate) {
      errors.overrideDate = 'Date of attendance is required.';
    }
    if (!overrideReason.trim()) {
      errors.overrideReason = 'Override justification reason is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setActionLoading(true);
    try {
      await axiosClient.post('/attendance/override', {
        employeeId: selectedEmpId,
        attendanceDate: overrideDate,
        status: overrideStatus,
        checkInTime: checkInTime ? new Date(checkInTime).toISOString() : null,
        checkOutTime: checkOutTime ? new Date(checkOutTime).toISOString() : null,
        overrideReason,
      });
      closeOverrideModal();
      fetchLogs();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Filter logs by search term
  const filteredLogs = logs.filter(log => {
    if (!search.trim()) return true;
    const name = log.employeeId ? `${log.employeeId.firstName} ${log.employeeId.lastName}`.toLowerCase() : '';
    return name.includes(search.toLowerCase());
  });

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
      header: 'Date',
      key: 'attendanceDate',
      render: (val) => (
        <span className="font-bold text-slate-700">
          {formatDateDisplay(val)}
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
      header: 'Expected Check Out',
      key: 'expectedCheckoutTime',
      render: (val) => (val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'),
    },
    {
      header: 'Working Hours',
      key: 'workingMinutes',
      render: (val, row) => {
        if (!row.checkInTime) return '-';
        if (row.status === 'checked_in') return 'In Progress';
        const hrs = Math.floor(val / 60);
        const mins = val % 60;
        return `${hrs}h ${mins}m`;
      },
    },
    {
      header: 'Late / Overtime',
      key: '_id',
      render: (_, row) => {
        const formatMins = (mins) => {
          const hrs = Math.floor(mins / 60);
          const m = mins % 60;
          return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
        };
        return (
          <div className="flex flex-col text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {row.lateMinutes > 0 && <span className="text-amber-600">Late: {formatMins(row.lateMinutes)}</span>}
            {row.overtimeMinutes > 0 && <span className="text-emerald-600">OT: {formatMins(row.overtimeMinutes)}</span>}
            {!row.lateMinutes && !row.overtimeMinutes && <span>-</span>}
          </div>
        );
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
          not_joined: 'bg-slate-50 text-slate-400 border-slate-100',
        };
        const labels = {
          checked_in: 'Checked In',
          present: 'Present',
          half_day: 'Half Day',
          absent: 'Absent',
          missed_punch: 'Missed Punch',
          pending_regularization: 'Pending Correction',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Attendance Reports</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Generate and export company-wide attendance worksheets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button variant="outline" icon={FiEdit} onClick={openOverrideModal}>
              Override Attendance
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-4 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Filters Card */}
      <Card title="Filter & Search" subtitle="Customize the reports table dataset">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div className="relative">
            <Input
              label="Search Employee"
              type="text"
              placeholder="Type name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="primary" onClick={fetchLogs} icon={FiSearch} className="h-[42px] justify-center">
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Reports Table Grid */}
      <Card title="Logs Worksheet" subtitle="Consolidated logs worksheets based on date ranges">
        <Table
          columns={columns}
          data={filteredLogs}
          loading={loading}
          emptyMessage="No attendance records found matching filters."
        />
      </Card>

      {/* Admin Override Modal */}
      {overrideModalOpen && (
        <Modal isOpen={overrideModalOpen} title="HR / Admin Attendance Override" onClose={closeOverrideModal}>
          <form onSubmit={handleOverrideSubmit} noValidate className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 font-medium">
              Manually overwrite or force insert an attendance record for any employee.
            </p>
            {formError && <span className="text-xs text-rose-600 font-bold">{formError}</span>}
            
            <Input
              label="Select Employee"
              type="select"
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              placeholder="Choose employee..."
              options={employees.map(emp => ({
                value: emp._id,
                label: `${emp.firstName} ${emp.lastName} (${emp.email})`
              }))}
              required
              error={fieldErrors.selectedEmpId}
            />

            <Input
              label="Date of Attendance"
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              required
              error={fieldErrors.overrideDate}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Check In Time"
                type="datetime-local"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
              <Input
                label="Check Out Time"
                type="datetime-local"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>

            <Input
              label="Override Status"
              type="select"
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              options={[
                { value: 'present', label: 'Present' },
                { value: 'half_day', label: 'Half Day' },
                { value: 'absent', label: 'Absent' },
                { value: 'missed_punch', label: 'Missed Punch' },
                { value: 'pending_regularization', label: 'Pending Correction' },
                { value: 'checked_in', label: 'Checked In' },
              ]}
              required
            />

            <Input
              label="Override Justification Reason"
              type="textarea"
              placeholder="Why are you adjusting this record? (Audit tracking requirement)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              required
              error={fieldErrors.overrideReason}
            />

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="secondary" onClick={closeOverrideModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={actionLoading}>
                Override & Save Record
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AttendanceReports;
