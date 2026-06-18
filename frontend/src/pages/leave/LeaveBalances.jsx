import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { FiSearch, FiSliders, FiUserCheck } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/user.utils';

const LeaveBalances = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustType, setAdjustType] = useState('add');
  const [remarks, setRemarks] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const canManage = hasPermission(user, 'leaveBalance.manage');

  const fetchBalances = async () => {
    setLoading(true);
    try {
      // Regular employees get their own balances automatically due to backend IDOR prevention
      const res = await axiosClient.get('/leave/balances');
      setBalances(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    if (!canManage) return;
    try {
      const [typesRes, empRes] = await Promise.all([
        axiosClient.get('/leave/types?status=active'),
        axiosClient.get('/employees/list').catch(() => ({ data: { data: { users: [] } } })),
      ]);
      setLeaveTypes(typesRes.data.data || []);
      setEmployees(empRes.data.data?.users || []);
    } catch (err) {
      console.error('Error fetching auxiliary data:', err);
    }
  };

  useEffect(() => {
    fetchBalances();
    fetchAuxiliaryData();
  }, [user]);

  const validateForm = () => {
    const errors = {};
    if (!selectedEmployeeId) errors.employeeId = 'Employee selection is required.';
    if (!selectedLeaveTypeId) errors.leaveTypeId = 'Leave type selection is required.';
    if (adjustmentAmount === undefined || adjustmentAmount === '') {
      errors.adjustmentAmount = 'Adjustment quota is required.';
    } else if (Number(adjustmentAmount) < 0) {
      errors.adjustmentAmount = 'Quota must be a non-negative number.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!validateForm()) return;

    setBtnLoading(true);
    const payload = {
      employeeId: selectedEmployeeId,
      leaveTypeId: selectedLeaveTypeId,
      adjustmentAmount: Number(adjustmentAmount),
      type: adjustType,
      remarks: remarks.trim(),
    };

    try {
      await axiosClient.put('/leave/balances/adjust', payload);
      setModalOpen(false);
      resetForm();
      fetchBalances();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setBtnLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setSelectedLeaveTypeId('');
    setAdjustmentAmount(0);
    setAdjustType('add');
    setRemarks('');
    setFormError('');
    setFieldErrors({});
  };

  const openAdjustmentModal = () => {
    resetForm();
    setModalOpen(true);
  };

  // Local filtering (Scoped to employee name / department / leave code)
  const filteredBalances = balances.filter((b) => {
    if (!b) return false;
    const isEmpObj = b.employeeId && typeof b.employeeId === 'object';
    const isTypeObj = b.leaveTypeId && typeof b.leaveTypeId === 'object';

    const empName = isEmpObj ? `${b.employeeId.firstName || ''} ${b.employeeId.lastName || ''}`.trim().toLowerCase() : '';
    const empCode = isEmpObj && b.employeeId.employeeCode ? b.employeeId.employeeCode.toLowerCase() : '';
    const leaveCode = isTypeObj && b.leaveTypeId.code ? b.leaveTypeId.code.toLowerCase() : '';
    const leaveName = isTypeObj && b.leaveTypeId.name ? b.leaveTypeId.name.toLowerCase() : '';

    const matchesSearch =
      empName.includes(searchTerm.toLowerCase()) ||
      empCode.includes(searchTerm.toLowerCase()) ||
      leaveCode.includes(searchTerm.toLowerCase()) ||
      leaveName.includes(searchTerm.toLowerCase());

    const matchesLeaveType = leaveTypeFilter === '' || 
      (isTypeObj ? b.leaveTypeId._id === leaveTypeFilter : b.leaveTypeId === leaveTypeFilter);

    return matchesSearch && matchesLeaveType;
  });

  const columns = [
    {
      header: 'Employee',
      key: 'employeeId',
      render: (emp) => {
        if (!emp) return <span className="text-slate-400">-</span>;
        if (typeof emp !== 'object') return <span className="text-slate-500 font-semibold">{emp}</span>;
        const initials = ((emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-black">
              {initials || '??'}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">
                {emp.firstName || ''} {emp.lastName || ''}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                {emp.employeeCode || 'No Code'}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Leave Type',
      key: 'leaveTypeId',
      render: (type) => {
        if (!type) return <span className="text-slate-400">-</span>;
        if (typeof type !== 'object') return <span className="text-slate-500 font-semibold">{type}</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-800 text-xs font-black uppercase tracking-wider">
              {type.code || ''}
            </span>
            <span className="text-slate-500 font-semibold text-xs">{type.name || ''}</span>
          </div>
        );
      },
    },
    {
      header: 'Allocated',
      key: 'allocated',
      render: (val) => <span className="font-bold text-slate-700 text-xs">{val} day(s)</span>,
    },
    {
      header: 'Used',
      key: 'used',
      render: (val) => <span className="font-semibold text-rose-600 text-xs">{val} day(s)</span>,
    },
    {
      header: 'Remaining',
      key: 'remaining',
      render: (val) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black shadow-xs ${
          val > 5
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : val > 0
            ? 'bg-amber-50 text-amber-700 border border-amber-100'
            : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {val} day(s) remaining
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Leave Balances</h2>
          <p className="text-slate-400 text-xs font-semibold mt-1">Track and manage employee leave balances and ledger allocations</p>
        </div>

        {canManage && (
          <Button variant="primary" icon={FiUserCheck} onClick={openAdjustmentModal}>
            Adjust Balance
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder={canManage ? "Search by employee code/name..." : "Search leave types..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
            />
          </div>

          <div className="flex gap-2 items-center w-full sm:w-auto">
            <FiSliders className="text-slate-400 w-4 h-4 hidden sm:block" />
            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-bold focus:outline-none focus:border-indigo-600 transition-all w-full sm:w-auto"
            >
              <option value="">All Leave Types</option>
              {canManage
                ? leaveTypes.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.code})</option>)
                : balances.reduce((acc, b) => {
                    if (b.leaveTypeId && !acc.find((t) => t.id === b.leaveTypeId._id)) {
                      acc.push({ id: b.leaveTypeId._id, name: b.leaveTypeId.name, code: b.leaveTypeId.code });
                    }
                    return acc;
                  }, []).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <Table
          columns={columns}
          data={filteredBalances}
          loading={loading}
          emptyMessage={canManage ? "No leave balances found." : "You currently have no leave balances allocated."}
        />
      </Card>

      {/* Manual Balance Adjustment Modal */}
      {canManage && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Adjust Employee Leave Balance"
          size="md"
        >
          <form onSubmit={handleAdjustSubmit} noValidate className="flex flex-col gap-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl">
                {formError}
              </div>
            )}

            <Input
              type="select"
              label="Select Employee"
              name="employeeId"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              options={employees.map((emp) => ({
                value: emp._id,
                label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode || 'No Code'})`,
              }))}
              placeholder="Choose an employee..."
              required
              error={fieldErrors.employeeId}
            />

            <Input
              type="select"
              label="Select Leave Type"
              name="leaveTypeId"
              value={selectedLeaveTypeId}
              onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
              options={leaveTypes.map((t) => ({
                value: t._id,
                label: `${t.name} (${t.code})`,
              }))}
              placeholder="Choose a leave type..."
              required
              error={fieldErrors.leaveTypeId}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="select"
                  label="Adjustment Type"
                  name="adjustType"
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  options={[
                    { value: 'add', label: 'Add Quota' },
                    { value: 'deduct', label: 'Deduct Quota' },
                    { value: 'set', label: 'Set Absolute' },
                  ]}
                />
              </div>
              <div>
                <Input
                  type="number"
                  label="Amount (Days)"
                  name="adjustmentAmount"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  min="0"
                  required
                  error={fieldErrors.adjustmentAmount}
                />
              </div>
            </div>

            <Input
              type="textarea"
              label="Remarks"
              name="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide reason for this manual adjustment..."
            />

            <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={btnLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={btnLoading}>
                Apply Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LeaveBalances;
