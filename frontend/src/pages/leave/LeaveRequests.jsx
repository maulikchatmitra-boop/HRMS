import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import {
  FiPlus,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiCornerUpLeft,
  FiFileText,
  FiUser,
  FiCalendar,
  FiSearch,
  FiInfo,
  FiSliders,
  FiPaperclip,
  FiTrash2,
  FiLoader,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, getRoleCategory, formatDateDisplay, formatDateTimeDisplay } from '../../utils/user.utils';

const LeaveRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  // Tab State
  // Main Tabs: 'my-leaves' or 'approvals'
  const [mainTab, setMainTab] = useState('my-leaves');
  // Sub-status tabs for approvals: 'pending', 'approved', 'rejected', 'sent_back'
  const [approvalSubTab, setApprovalSubTab] = useState('pending');
  // Sub-status tabs for employee: 'all', 'pending', 'approved', 'rejected', 'sent_back'
  const [employeeSubTab, setEmployeeSubTab] = useState('all');

  // Filters State
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  // Modals
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Apply Form State
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState('');
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [applyBtnLoading, setApplyBtnLoading] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applyFieldErrors, setApplyFieldErrors] = useState({});

  // Action Confirmation (Approve/Reject/Send Back)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(''); // 'approve', 'reject', 'send_back'
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionBtnLoading, setActionBtnLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionRemarksError, setActionRemarksError] = useState('');

  const canApprove = hasPermission(user, 'leave.approve') || getRoleCategory(user.role?.roleName) === 'Manager';
  const canApply = hasPermission(user, 'leave.apply');

  const applicantRoleName = selectedRequest?.employeeId?.roleId?.roleName || '';
  const isApplicantHR = applicantRoleName.toLowerCase().includes('hr');
  const isUserAdmin = getRoleCategory(user?.role?.roleName) === 'Company Admin';
  const isOwnRequest = selectedRequest && (selectedRequest.employeeId?._id || selectedRequest.employeeId) === user?._id;
  const showActionButtons = isOwnRequest ? false : (isApplicantHR ? isUserAdmin : canApprove);

  const fetchLeaveRequests = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    setError('');

    let requestType = 'my-requests';
    let requestStatus = '';

    if (mainTab === 'approvals') {
      requestType = 'approvals';
      if (approvalSubTab === 'pending') {
        requestType = 'approvals'; // Backend automatically resolves pending HR vs pending Manager
      } else {
        requestType = 'all'; // Pull historically acted leaves
        requestStatus = approvalSubTab;
      }
    } else {
      requestType = 'my-requests';
      if (employeeSubTab !== 'all') {
        requestStatus = employeeSubTab;
      }
    }

    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        type: requestType,
      });

      if (requestStatus) params.append('status', requestStatus);
      if (leaveTypeFilter) params.append('leaveTypeId', leaveTypeFilter);
      if (fromDateFilter) params.append('fromDate', fromDateFilter);
      if (toDateFilter) params.append('toDate', toDateFilter);

      const res = await axiosClient.get(`/leave/requests?${params.toString()}`);
      setRequests(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await axiosClient.get('/leave/types?status=active');
      setLeaveTypes(res.data.data || []);
    } catch (err) {
      console.error('Error fetching leave types:', err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await axiosClient.get('/holidays?limit=100');
      setHolidays(res.data.data || []);
    } catch (err) {
      console.error('Error fetching holidays:', err);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [mainTab, approvalSubTab, employeeSubTab, page, leaveTypeFilter, fromDateFilter, toDateFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLeaveRequests(true);
      }
    }, 15000); // Poll every 15 seconds silently, only if tab is visible
    return () => clearInterval(interval);
  }, [mainTab, approvalSubTab, employeeSubTab, page, leaveTypeFilter, fromDateFilter, toDateFilter]);

  useEffect(() => {
    fetchLeaveTypes();
    fetchHolidays();
  }, []);

  // Sync toDate with fromDate when isHalfDay is active
  useEffect(() => {
    if (isHalfDay && fromDate) {
      setToDate(fromDate);
    }
  }, [isHalfDay, fromDate]);

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isHolidayDate = (dateStr) => {
    if (!dateStr) return false;
    return holidays.some(h => {
      if (!h.date) return false;
      const hDateStr = h.date.split('T')[0];
      return hDateStr === dateStr;
    });
  };

  const handleFromDateChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setFromDate('');
      return;
    }
    const todayStr = getTodayDateString();
    if (val < todayStr) {
      setApplyFieldErrors(prev => ({ ...prev, fromDate: 'Cannot select past date.' }));
      setFromDate('');
      return;
    }
    const day = new Date(val).getUTCDay();
    if (day === 0 || day === 6) {
      setApplyFieldErrors(prev => ({ ...prev, fromDate: 'Saturdays and Sundays cannot be selected as leave days.' }));
      setFromDate('');
      return;
    }
    if (isHolidayDate(val)) {
      setApplyFieldErrors(prev => ({ ...prev, fromDate: 'Cannot select a public holiday as a leave day.' }));
      setFromDate('');
      return;
    }
    setFromDate(val);
    setApplyFieldErrors(prev => {
      const copy = { ...prev };
      delete copy.fromDate;
      return copy;
    });
  };

  const handleToDateChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setToDate('');
      return;
    }
    const todayStr = getTodayDateString();
    if (val < todayStr) {
      setApplyFieldErrors(prev => ({ ...prev, toDate: 'Cannot select past date.' }));
      setToDate('');
      return;
    }
    const day = new Date(val).getUTCDay();
    if (day === 0 || day === 6) {
      setApplyFieldErrors(prev => ({ ...prev, toDate: 'Saturdays and Sundays cannot be selected as leave days.' }));
      setToDate('');
      return;
    }
    if (isHolidayDate(val)) {
      setApplyFieldErrors(prev => ({ ...prev, toDate: 'Cannot select a public holiday as a leave day.' }));
      setToDate('');
      return;
    }
    setToDate(val);
    setApplyFieldErrors(prev => {
      const copy = { ...prev };
      delete copy.toDate;
      return copy;
    });
  };

  const validateApplyForm = () => {
    const errors = {};
    const todayStr = getTodayDateString();

    if (!selectedLeaveTypeId) errors.leaveTypeId = 'Leave type is required.';

    if (!fromDate) {
      errors.fromDate = 'Start date is required.';
    } else {
      if (fromDate < todayStr) {
        errors.fromDate = 'Cannot select past date.';
      } else {
        const fromDay = new Date(fromDate).getUTCDay();
        if (fromDay === 0 || fromDay === 6) {
          errors.fromDate = 'Saturdays and Sundays cannot be selected as leave days.';
        } else if (isHolidayDate(fromDate)) {
          errors.fromDate = 'Cannot select a public holiday as a leave day.';
        }
      }
    }

    if (!isHalfDay) {
      if (!toDate) {
        errors.toDate = 'End date is required.';
      } else {
        if (toDate < todayStr) {
          errors.toDate = 'Cannot select past date.';
        } else {
          const toDay = new Date(toDate).getUTCDay();
          if (toDay === 0 || toDay === 6) {
            errors.toDate = 'Saturdays and Sundays cannot be selected as leave days.';
          } else if (isHolidayDate(toDate)) {
            errors.toDate = 'Cannot select a public holiday as a leave day.';
          }
        }
      }
      if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
        errors.toDate = 'End date cannot be prior to start date.';
      }
    }
    if (!reason.trim()) errors.reason = 'Reason for leave is required.';

    setApplyFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyError('');
    setApplyFieldErrors({});

    if (!validateApplyForm()) return;

    setApplyBtnLoading(true);
    const payload = {
      leaveTypeId: selectedLeaveTypeId,
      fromDate,
      toDate: isHalfDay ? fromDate : toDate,
      isHalfDay,
      reason: reason.trim(),
      attachment: attachment.trim() || null,
    };

    try {
      await axiosClient.post('/leave/requests', payload);
      setApplyModalOpen(false);
      resetApplyForm();
      fetchLeaveRequests();
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (err) {
      setApplyError(extractErrorMessage(err));
    } finally {
      setApplyBtnLoading(false);
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setApplyError('Attachment file size must be less than 10MB.');
      return;
    }

    setUploading(true);
    setApplyError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axiosClient.post('/leave/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAttachment(res.data.data.url);
      setAttachmentFileName(file.name);
    } catch (err) {
      setApplyError(extractErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment('');
    setAttachmentFileName('');
  };

  const resetApplyForm = () => {
    setSelectedLeaveTypeId('');
    setFromDate('');
    setToDate('');
    setIsHalfDay(false);
    setReason('');
    setAttachment('');
    setAttachmentFileName('');
    setApplyError('');
    setApplyFieldErrors({});
  };

  // Process actions (Approve, Reject, Send Back)
  const openActionConfirmation = (action) => {
    setPendingAction(action);
    setActionRemarks('');
    setActionError('');
    setActionRemarksError('');
    setActionModalOpen(true);
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionRemarksError('');

    if ((pendingAction === 'reject' || pendingAction === 'send_back') && !actionRemarks.trim()) {
      setActionRemarksError('Remarks are required for rejecting or sending back leave requests.');
      return;
    }

    setActionBtnLoading(true);
    try {
      await axiosClient.put(`/leave/requests/${selectedRequest._id}/action`, {
        action: pendingAction,
        remarks: actionRemarks.trim(),
      });
      setActionModalOpen(false);
      setDetailModalOpen(false);
      setSelectedRequest(null);
      fetchLeaveRequests();
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setActionBtnLoading(false);
    }
  };

  const handleCancelRequest = async (request) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await axiosClient.put(`/leave/requests/${request._id}/action`, {
        action: 'cancel',
        remarks: 'Cancelled by employee',
      });
      fetchLeaveRequests();
      window.dispatchEvent(new Event('refreshNotifications'));
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const openDetailsModal = async (request) => {
    try {
      const res = await axiosClient.get(`/leave/requests/${request._id}`);
      setSelectedRequest(res.data.data);
      setDetailModalOpen(true);
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const getStatusBadge = (status, requestObj = null) => {
    const styles = {
      pending_manager: 'bg-amber-50 text-amber-700 border border-amber-100',
      pending_hr: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      approved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      rejected: 'bg-rose-50 text-rose-700 border border-rose-100',
      sent_back: 'bg-slate-100 text-slate-700 border border-slate-200',
      cancelled: 'bg-slate-50 text-slate-400 border border-slate-150',
    };

    const applicantRoleName = requestObj?.employeeId?.roleId?.roleName || '';
    const isApplicantHR = applicantRoleName.toLowerCase().includes('hr');

    const labels = {
      pending_manager: 'Pending Manager',
      pending_hr: isApplicantHR ? 'Pending Admin' : 'Pending HR',
      approved: 'Approved',
      rejected: 'Rejected',
      sent_back: 'Sent Back',
      cancelled: 'Cancelled',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black tracking-wide ${styles[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  const columns = [
    {
      header: 'Employee',
      key: 'employeeName',
      render: (val, item) => {
        const isOwn = (item.employeeId?._id || item.employeeId) === user._id;
        return (
          <div>
            {val && !isOwn && <p className="font-bold text-slate-800 text-sm">{val}</p>}
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
              {item.departmentName || 'Unassigned'}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Leave Type',
      key: 'leaveTypeId',
      render: (type) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-bold uppercase">
          {type?.code || 'Type'}
        </span>
      ),
    },
    {
      header: 'Duration',
      key: 'totalDays',
      render: (val, item) => (
        <div>
          <p className="font-black text-slate-800 text-xs">{val} Day(s)</p>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            {formatDateDisplay(item.fromDate)} - {formatDateDisplay(item.toDate)}
          </p>
        </div>
      ),
    },
    {
      header: 'Reason',
      key: 'reason',
      render: (val) => <span className="text-slate-500 text-xs font-semibold max-w-xs block truncate">{val}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (val, item) => getStatusBadge(val, item),
    },
    {
      header: 'Actions',
      key: '_id',
      render: (_, item) => {
        const isOwn = (item.employeeId?._id || item.employeeId) === user._id;
        const isPending = ['pending_manager', 'pending_hr', 'sent_back'].includes(item.status);

        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={FiInfo} onClick={() => openDetailsModal(item)}>
              View
            </Button>
            {isOwn && isPending && (
              <Button
                variant="outline"
                size="sm"
                icon={FiXCircle}
                className="!text-rose-600 hover:!bg-rose-50 hover:!border-rose-100"
                onClick={() => handleCancelRequest(item)}
              >
                Cancel
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Leave Requests</h2>
          <p className="text-slate-400 text-xs font-semibold mt-1">Submit leave applications, view history, or process approvals</p>
        </div>

        {canApply && (
          <Button variant="primary" icon={FiPlus} onClick={() => { resetApplyForm(); setApplyModalOpen(true); }}>
            Apply Leave
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      {/* Main Tab Controls */}
      {canApprove && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setMainTab('my-leaves'); setPage(1); }}
            className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              mainTab === 'my-leaves'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            My Leaves
          </button>
          <button
            onClick={() => { setMainTab('approvals'); setPage(1); }}
            className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              mainTab === 'approvals'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Team Approvals
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card className="!p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <FiSliders className="text-slate-400 w-4 h-4" />
            <select
              value={leaveTypeFilter}
              onChange={(e) => { setLeaveTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-bold focus:outline-none focus:border-indigo-600 transition-all"
            >
              <option value="">All Leave Types</option>
              {leaveTypes.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.code})</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={fromDateFilter}
              onChange={(e) => { setFromDateFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-bold focus:outline-none"
            />
            <span className="text-slate-400 text-xs font-bold">to</span>
            <input
              type="date"
              value={toDateFilter}
              onChange={(e) => { setToDateFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-bold focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Sub-status Navigation */}
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {mainTab === 'my-leaves' ? (
          <>
            {[
              { id: 'all', label: 'All Requests' },
              { id: 'pending_manager', label: 'Pending Manager' },
              { id: 'pending_hr', label: 'Pending HR' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'sent_back', label: 'Sent Back' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => { setEmployeeSubTab(sub.id); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  employeeSubTab === sub.id
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </>
        ) : (
          <>
            {[
              { id: 'pending', label: 'Pending Action' },
              { id: 'approved', label: 'Approved History' },
              { id: 'rejected', label: 'Rejected History' },
              { id: 'sent_back', label: 'Sent Back History' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => { setApprovalSubTab(sub.id); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  approvalSubTab === sub.id
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <Table
          columns={columns}
          data={requests}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          emptyMessage="No leave requests found matching these filters."
        />
      </Card>

      {/* Apply Leave Modal */}
      {canApply && (
        <Modal isOpen={applyModalOpen} onClose={() => setApplyModalOpen(false)} title="Apply for Leave" size="md">
          <form onSubmit={handleApplySubmit} noValidate className="flex flex-col gap-4">
            {applyError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl">
                {applyError}
              </div>
            )}

            <Input
              type="select"
              label="Leave Type"
              name="leaveTypeId"
              value={selectedLeaveTypeId}
              onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
              options={leaveTypes.map((t) => ({ value: t._id, label: `${t.name} (${t.code})` }))}
              placeholder="Select leave type..."
              required
              error={applyFieldErrors.leaveTypeId}
            />

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="isHalfDay"
                checked={isHalfDay}
                onChange={(e) => {
                  setIsHalfDay(e.target.checked);
                  if (e.target.checked && fromDate) {
                    setToDate(fromDate);
                  }
                }}
                className="w-4 h-4 text-indigo-600 border-slate-350 rounded-sm focus:ring-indigo-500"
              />
              <label htmlFor="isHalfDay" className="text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer select-none">
                Apply for Half Day
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label={isHalfDay ? "Date" : "From Date"}
                name="fromDate"
                value={fromDate}
                onChange={handleFromDateChange}
                required
                min={getTodayDateString()}
                error={applyFieldErrors.fromDate}
              />
              {!isHalfDay && (
                <Input
                  type="date"
                  label="To Date"
                  name="toDate"
                  value={toDate}
                  onChange={handleToDateChange}
                  required
                  min={fromDate || getTodayDateString()}
                  error={applyFieldErrors.toDate}
                />
              )}
            </div>

            <Input
              type="textarea"
              label="Reason for Leave"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a detailed explanation..."
              required
              error={applyFieldErrors.reason}
            />

            {/* Attachment File Upload */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Supporting Attachment (Optional)
              </span>
              
              {!attachment ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors duration-300">
                  <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    {uploading ? (
                      <FiLoader className="w-8 h-8 text-indigo-600 animate-spin" />
                    ) : (
                      <FiPaperclip className="w-8 h-8 text-indigo-600" />
                    )}
                    <span className="text-xs font-bold text-slate-600 mt-1">
                      {uploading ? "Uploading attachment..." : "Click to select a document"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PDF, Images, DOCX (Max 10MB)
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentUpload}
                    disabled={uploading}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                      <FiFileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {attachmentFileName || "Uploaded Attachment"}
                      </p>
                      <a
                        href={attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                      >
                        View Attachment
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                    title="Remove Attachment"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setApplyModalOpen(false)} disabled={applyBtnLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={applyBtnLoading} disabled={uploading}>
                Submit Application
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details View Modal */}
      {selectedRequest && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Leave Request Details"
          size="lg"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-black shadow-xs">
                  <FiUser />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">{selectedRequest.employeeName}</h4>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">
                    {selectedRequest.departmentName || 'No Dept'} • {selectedRequest.employeeCode || 'No Code'}
                  </p>
                </div>
              </div>

              <div>{getStatusBadge(selectedRequest.status, selectedRequest)}</div>
            </div>

            {/* Leave Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Leave Type</span>
                <p className="font-bold text-slate-800 text-xs mt-1">
                  {selectedRequest.leaveTypeId?.name} ({selectedRequest.leaveTypeId?.code})
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Dates</span>
                <p className="font-bold text-slate-800 text-xs mt-1">
                  {formatDateDisplay(selectedRequest.fromDate)} - {formatDateDisplay(selectedRequest.toDate)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Leave Duration</span>
                <p className="font-bold text-slate-800 text-xs mt-1">
                  {selectedRequest.totalDays} day(s) {selectedRequest.isHalfDay && '(Half Day)'}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Reason</span>
              <p className="text-slate-600 text-xs font-semibold mt-1 bg-white p-3 border border-slate-150 rounded-xl leading-relaxed">
                {selectedRequest.reason}
              </p>
            </div>

            {selectedRequest.attachment && (
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Supporting Document</span>
                <a
                  href={selectedRequest.attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 mt-1.5 p-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 rounded-xl text-indigo-700 text-xs font-bold transition-all w-fit"
                >
                  <FiFileText />
                  <span>View Attachment</span>
                </a>
              </div>
            )}

            {/* History Tracker */}
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                <FiClock /> Approval History
              </h4>
              <div className="flex flex-col gap-3 relative pl-6 border-l border-slate-200 ml-3 py-1">
                {selectedRequest.approvalHistory.map((hist, idx) => {
                  const actLabels = {
                    apply: 'Applied',
                    approve: 'Approved',
                    reject: 'Rejected',
                    send_back: 'Sent Back',
                    cancel: 'Cancelled',
                  };
                  const actIcons = {
                    apply: <FiPlus className="w-3 h-3 text-indigo-600" />,
                    approve: <FiCheckCircle className="w-3 h-3 text-emerald-600" />,
                    reject: <FiXCircle className="w-3 h-3 text-rose-600" />,
                    send_back: <FiCornerUpLeft className="w-3 h-3 text-slate-600" />,
                    cancel: <FiXCircle className="w-3 h-3 text-slate-400" />,
                  };
                  const actColors = {
                    apply: 'bg-indigo-50 border-indigo-100',
                    approve: 'bg-emerald-50 border-emerald-100',
                    reject: 'bg-rose-50 border-rose-100',
                    send_back: 'bg-slate-100 border-slate-250',
                    cancel: 'bg-slate-50 border-slate-200',
                  };

                  return (
                    <div key={idx} className="relative flex flex-col gap-1">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[35px] top-0.5 w-6 h-6 rounded-lg flex items-center justify-center border ${actColors[hist.action]}`}>
                        {actIcons[hist.action]}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>
                          {hist.actorId ? `${hist.actorId.firstName} ${hist.actorId.lastName}` : 'System'} ({actLabels[hist.action]})
                        </span>
                        <span>{formatDateTimeDisplay(hist.createdAt)}</span>
                      </div>
                      {hist.remarks && (
                        <p className="text-slate-500 text-xs font-semibold leading-relaxed pl-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded-lg">
                          {hist.remarks}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manager / HR Action Controls */}
            {showActionButtons && ['pending_manager', 'pending_hr'].includes(selectedRequest.status) && (
              <div className="flex flex-wrap gap-2 justify-end border-t border-slate-100 pt-4 mt-2">
                <Button
                  variant="secondary"
                  icon={FiCornerUpLeft}
                  onClick={() => openActionConfirmation('send_back')}
                >
                  Send Back
                </Button>
                <Button
                  variant="danger"
                  icon={FiXCircle}
                  onClick={() => openActionConfirmation('reject')}
                >
                  Reject
                </Button>
                <Button
                  variant="success"
                  icon={FiCheckCircle}
                  onClick={() => openActionConfirmation('approve')}
                >
                  Approve
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Approve/Reject/SendBack Remarks Modal */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={`${pendingAction === 'approve' ? 'Approve' : pendingAction === 'reject' ? 'Reject' : 'Send Back'} Request`}
        size="md"
      >
        <form onSubmit={handleActionSubmit} noValidate className="flex flex-col gap-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl">
              {actionError}
            </div>
          )}

          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            {pendingAction === 'approve'
              ? 'Are you sure you want to approve this leave request? Leave balances will be adjusted.'
              : `Please provide remarks for this action. Remarks are mandatory when rejecting or sending back a request.`}
          </p>

          <Input
            type="textarea"
            label="Remarks / Comments"
            name="actionRemarks"
            value={actionRemarks}
            onChange={(e) => {
              setActionRemarks(e.target.value);
              if (e.target.value.trim()) setActionRemarksError('');
            }}
            placeholder="Provide comments..."
            required={pendingAction !== 'approve'}
            error={actionRemarksError}
          />

          <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setActionModalOpen(false)} disabled={actionBtnLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={pendingAction === 'approve' ? 'success' : pendingAction === 'reject' ? 'danger' : 'primary'}
              loading={actionBtnLoading}
            >
              Confirm Action
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveRequests;
