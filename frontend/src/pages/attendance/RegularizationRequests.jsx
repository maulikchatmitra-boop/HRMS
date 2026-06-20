import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, formatDateDisplay } from '../../utils/user.utils';
import { FiCheck, FiX, FiAlertTriangle, FiPlus } from 'react-icons/fi';

const RegularizationRequests = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-requests');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Submit Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regReason, setRegReason] = useState('');
  const [formError, setFormError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Approval Modals
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [action, setAction] = useState('approve'); // approve or reject
  const [remarks, setRemarks] = useState('');
  const [targetStatus, setTargetStatus] = useState('present'); // present or half_day
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approveFieldErrors, setApproveFieldErrors] = useState({});

  const openSubmitModal = () => {
    setFormError('');
    setFieldErrors({});
    setRegDate('');
    setRegReason('');
    setSubmitModalOpen(true);
  };

  const closeSubmitModal = () => {
    setFormError('');
    setFieldErrors({});
    setRegDate('');
    setRegReason('');
    setSubmitModalOpen(false);
  };

  const closeApproveModal = () => {
    setFormError('');
    setApproveFieldErrors({});
    setRemarks('');
    setApproveModalOpen(false);
    setSelectedRequest(null);
  };

  const canApprove = hasPermission(user, 'attendance.approve') || hasPermission(user, 'attendance.manage');

  const fetchMyRequests = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const res = await axiosClient.get(`/attendance/my-logs?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31`);
      const list = res.data.data || [];
      // Filter records with regularization details
      const filtered = list.filter(r => r.regularizationReason !== null && !r.isVirtual);
      setMyRequests(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingRequests = async () => {
    if (!canApprove) return;
    try {
      const currentYear = new Date().getFullYear();
      // Fetch team logs
      const res = await axiosClient.get(`/attendance/team-logs?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31`);
      const list = res.data.data || [];
      // Filter records that are pending manager regularization
      const filtered = list.filter(r => r.status === 'pending_regularization');
      setPendingRequests(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchMyRequests(), fetchPendingRequests()]);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const errors = {};
    if (!regDate) {
      errors.regDate = 'Date of correction is required.';
    }
    if (!regReason.trim()) {
      errors.regReason = 'Explanation reason is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitLoading(true);
    try {
      await axiosClient.post('/attendance/regularize', {
        attendanceDate: regDate,
        regularizationReason: regReason,
      });
      closeSubmitModal();
      loadData();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenApproval = (request, act) => {
    setSelectedRequest(request);
    setAction(act);
    setRemarks('');
    setTargetStatus('present');
    setFormError('');
    setApproveFieldErrors({});
    setApproveModalOpen(true);
  };

  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setApproveFieldErrors({});

    if (action === 'approve' && !targetStatus) {
      setApproveFieldErrors({ targetStatus: 'Target status is required.' });
      return;
    }

    setApprovalLoading(true);
    try {
      await axiosClient.post(`/attendance/approve-regularization/${selectedRequest._id}`, {
        action,
        remarks,
        regularizedStatus: action === 'approve' ? targetStatus : undefined,
      });
      closeApproveModal();
      loadData();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setApprovalLoading(false);
    }
  };

  const myColumns = [
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
      header: 'Reason',
      key: 'regularizationReason',
      render: (val) => {
        if (!val) return '-';
        // Split stacked reasons and filter out any empty entries
        const parts = val.split(' | ');
        return (
          <div className="flex flex-col gap-1 py-1">
            {parts.map((p, idx) => {
              // Highlight the total out time text if it contains Total Out Time
              const isOutTime = p.toLowerCase().includes('total out time');
              return (
                <span key={idx} className={`text-[11px] block leading-tight font-medium ${isOutTime ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>
                  {p}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      header: 'Approval Status',
      key: 'regularizationStatus',
      render: (val) => {
        const styles = {
          pending: 'bg-amber-50 text-amber-600 border-amber-100',
          approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          rejected: 'bg-rose-50 text-rose-600 border-rose-100',
        };
        const labels = {
          pending: 'Pending Approval',
          approved: 'Approved',
          rejected: 'Rejected',
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[val] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
            {labels[val] || val || 'Pending'}
          </span>
        );
      },
    },
    {
      header: 'Remarks',
      key: 'approvalRemarks',
      render: (val) => <span className="text-xs text-slate-400 italic font-medium">{val || 'No comments'}</span>,
    },
    {
      header: 'Approved By',
      key: 'approvedBy',
      render: (val) => {
        if (!val) return '-';
        if (typeof val === 'object' && val.firstName) {
          return <span className="text-xs text-slate-600 font-bold">{val.firstName} {val.lastName}</span>;
        }
        return <span className="text-xs text-slate-600 font-bold">Manager</span>;
      },
    },
  ];

  const pendingColumns = [
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
      header: 'Justification Reason',
      key: 'regularizationReason',
      render: (val) => {
        if (!val) return '-';
        const parts = val.split(' | ');
        return (
          <div className="flex flex-col gap-1 py-1">
            {parts.map((p, idx) => {
              const isOutTime = p.toLowerCase().includes('total out time');
              return (
                <span key={idx} className={`text-[11px] block leading-tight font-semibold ${isOutTime ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>
                  {p}
                </span>
              );
            })}
          </div>
        );
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
            {row.lateMinutes > 0 && <span>Late: {formatMins(row.lateMinutes)}</span>}
            {row.overtimeMinutes > 0 && <span>OT: {formatMins(row.overtimeMinutes)}</span>}
            {!row.lateMinutes && !row.overtimeMinutes && <span>-</span>}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      key: '_id',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="success"
            size="sm"
            icon={FiCheck}
            onClick={() => handleOpenApproval(row, 'approve')}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={FiX}
            onClick={() => handleOpenApproval(row, 'reject')}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Regularization Requests</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Submit correction requests or approve team requests
          </p>
        </div>
        <Button variant="primary" icon={FiPlus} onClick={openSubmitModal}>
          New Request
        </Button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-4 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Tabs */}
      {canApprove && (
        <div className="flex items-center gap-2 border-b border-slate-100 pb-px">
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all duration-200 cursor-pointer ${
              activeTab === 'my-requests'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab('pending-approvals')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all duration-200 cursor-pointer ${
              activeTab === 'pending-approvals'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Pending Approvals ({pendingRequests.length})
          </button>
        </div>
      )}

      {/* Grid Panels */}
      {activeTab === 'my-requests' ? (
        <Card title="My Correction Requests" subtitle="Correction history logs submitted by you">
          <Table
            columns={myColumns}
            data={myRequests}
            loading={loading}
            emptyMessage="No regularization requests submitted yet."
          />
        </Card>
      ) : (
        <Card title="Incoming Requests" subtitle="Regularization approvals pending your confirmation">
          <Table
            columns={pendingColumns}
            data={pendingRequests}
            loading={loading}
            emptyMessage="No pending regularization approvals found."
          />
        </Card>
      )}

      {/* New Request Modal */}
      {submitModalOpen && (
        <Modal isOpen={submitModalOpen} title="Submit Regularization Request" onClose={closeSubmitModal}>
          <form onSubmit={handleCreateRequest} noValidate className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 font-medium">
              Submit correction request for a specific date if you forgot to check in or out.
            </p>
            {formError && <span className="text-xs text-rose-600 font-bold">{formError}</span>}
            <Input
              label="Date of Correction"
              type="date"
              value={regDate}
              onChange={(e) => setRegDate(e.target.value)}
              required
              error={fieldErrors.regDate}
            />
            <Input
              label="Explanation Reason"
              type="textarea"
              placeholder="Provide a detailed explanation (forgot check-out, internet issue, client site, emergency, etc.)"
              value={regReason}
              onChange={(e) => setRegReason(e.target.value)}
              required
              error={fieldErrors.regReason}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="secondary" onClick={closeSubmitModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitLoading}>
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Approval Details Modal */}
      {approveModalOpen && selectedRequest && (
        <Modal isOpen={approveModalOpen} title={action === 'approve' ? 'Approve Request' : 'Reject Request'} onClose={closeApproveModal}>
          <form onSubmit={handleApprovalSubmit} noValidate className="flex flex-col gap-4">
            <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-1 border border-slate-100 text-sm">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Employee</span>
              <p className="font-bold text-slate-700">
                {selectedRequest.employeeId?.firstName} {selectedRequest.employeeId?.lastName}
              </p>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mt-2">Date & Reason</span>
              <p className="font-medium text-slate-600">{selectedRequest.attendanceDate}</p>
              <p className="text-xs font-semibold text-slate-500 bg-white border border-slate-100 p-2.5 rounded-lg mt-1 italic">
                "{selectedRequest.regularizationReason}"
              </p>
            </div>

            {action === 'approve' && (
              <Input
                label="Target Status"
                type="select"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                options={[
                  { value: 'present', label: 'Present' },
                  { value: 'half_day', label: 'Half Day' },
                ]}
                required
                error={approveFieldErrors.targetStatus}
              />
            )}

            <Input
              label="Approver Remarks"
              type="textarea"
              placeholder="Add feedback or remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="secondary" onClick={closeApproveModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={action === 'approve' ? 'success' : 'danger'}
                loading={approvalLoading}
              >
                Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default RegularizationRequests;
