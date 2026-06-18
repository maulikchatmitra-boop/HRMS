import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { FiPlus, FiEdit, FiSearch, FiCheckCircle, FiXCircle, FiGrid, FiTrash, FiBriefcase } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/user.utils';

const LeavePolicies = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toolbar state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  // Policy Form State
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [allocations, setAllocations] = useState([]); // [{ leaveTypeId, yearlyAllocation }]
  const [policyBtnLoading, setPolicyBtnLoading] = useState(false);
  const [policyFormError, setPolicyFormError] = useState('');
  const [policyFieldErrors, setPolicyFieldErrors] = useState({});

  // Assignment Form State
  const [assignments, setAssignments] = useState([]); // [{ type, targetId }]
  const [assignBtnLoading, setAssignBtnLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  const canCreate = hasPermission(user, 'leavePolicy.create');
  const canEdit = hasPermission(user, 'leavePolicy.edit');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [policiesRes, leaveTypesRes, deptsRes, rolesRes] = await Promise.all([
        axiosClient.get('/leave/policies'),
        axiosClient.get('/leave/types?status=active'),
        axiosClient.get('/departments').catch(() => ({ data: { data: [] } })),
        axiosClient.get('/roles/list').catch(() => ({ data: { data: [] } })),
      ]);

      setPolicies(policiesRes.data.data || []);
      setLeaveTypes(leaveTypesRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
      setRoles(rolesRes.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Form Validation
  const validatePolicyForm = () => {
    const errors = {};
    if (!policyName.trim()) {
      errors.policyName = 'Policy name is required.';
    }

    const validAllocations = allocations.filter((a) => a.yearlyAllocation > 0);
    if (validAllocations.length === 0) {
      errors.allocations = 'At least one leave type must have an allocation quota.';
    }

    setPolicyFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePolicySubmit = async (e) => {
    e.preventDefault();
    setPolicyFormError('');
    setPolicyFieldErrors({});

    if (!validatePolicyForm()) return;

    setPolicyBtnLoading(true);
    const validAllocations = allocations
      .filter((a) => a.yearlyAllocation > 0)
      .map((a) => ({
        leaveTypeId: a.leaveTypeId,
        yearlyAllocation: Number(a.yearlyAllocation),
      }));

    const payload = {
      policyName: policyName.trim(),
      description: description.trim(),
      leaveAllocations: validAllocations,
      status,
    };

    try {
      if (selectedPolicy) {
        await axiosClient.put(`/leave/policies/${selectedPolicy._id}`, payload);
      } else {
        await axiosClient.post('/leave/policies', payload);
      }
      setPolicyModalOpen(false);
      resetPolicyForm();
      fetchData();
    } catch (err) {
      setPolicyFormError(extractErrorMessage(err));
    } finally {
      setPolicyBtnLoading(false);
    }
  };

  const resetPolicyForm = () => {
    setPolicyName('');
    setDescription('');
    setStatus('active');
    setSelectedPolicy(null);
    setPolicyFormError('');
    setPolicyFieldErrors({});

    // Initialize allocations with 0 for all active leave types
    setAllocations(
      leaveTypes.map((type) => ({
        leaveTypeId: type._id,
        name: type.name,
        code: type.code,
        yearlyAllocation: 0,
      }))
    );
  };

  const openAddPolicyModal = () => {
    resetPolicyForm();
    setPolicyModalOpen(true);
  };

  const openEditPolicyModal = (policy) => {
    setSelectedPolicy(policy);
    setPolicyName(policy.policyName);
    setDescription(policy.description || '');
    setStatus(policy.status);
    setPolicyFormError('');
    setPolicyFieldErrors({});

    // Map existing allocations, fill remaining with 0
    const policyAllocMap = {};
    policy.leaveAllocations.forEach((a) => {
      policyAllocMap[a.leaveTypeId._id || a.leaveTypeId] = a.yearlyAllocation;
    });

    setAllocations(
      leaveTypes.map((type) => ({
        leaveTypeId: type._id,
        name: type.name,
        code: type.code,
        yearlyAllocation: policyAllocMap[type._id] || 0,
      }))
    );

    setPolicyModalOpen(true);
  };

  const handleTogglePolicyStatus = async (policy) => {
    if (!canEdit) return;
    const newStatus = policy.status === 'active' ? 'inactive' : 'active';
    try {
      await axiosClient.put(`/leave/policies/${policy._id}`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  // Assignment Handlers
  const openAssignModal = (policy) => {
    setSelectedPolicy(policy);
    setAssignments(
      (policy.assignments || [])
        .filter((a) => a.type === 'role')
        .map((a) => ({
          type: 'role',
          targetId: a.targetId || '',
        }))
    );
    setAssignError('');
    setAssignModalOpen(true);
  };

  const handleAddAssignmentRow = () => {
    setAssignments((prev) => [...prev, { type: 'role', targetId: '' }]);
  };

  const handleRemoveAssignmentRow = (index) => {
    setAssignments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAssignmentRowChange = (index, field, value) => {
    setAssignments((prev) =>
      prev.map((row, idx) => {
        if (idx === index) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setAssignError('');

    // Validate rows
    for (const row of assignments) {
      if (!row.targetId) {
        setAssignError('Please select a target Role for all assignments.');
        return;
      }
    }

    setAssignBtnLoading(true);
    const cleanedAssignments = assignments.map((row) => ({
      type: 'role',
      targetId: row.targetId,
    }));

    try {
      await axiosClient.post(`/leave/policies/${selectedPolicy._id}/assign`, {
        assignments: cleanedAssignments,
      });
      setAssignModalOpen(false);
      fetchData();
    } catch (err) {
      setAssignError(extractErrorMessage(err));
    } finally {
      setAssignBtnLoading(false);
    }
  };

  // Local filtering
  const filteredPolicies = policies.filter((p) => {
    const matchesSearch =
      p.policyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === '' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: 'Policy Name',
      key: 'policyName',
      render: (val) => <span className="font-bold text-slate-800 text-sm">{val}</span>,
    },
    {
      header: 'Allocations Summary',
      key: 'leaveAllocations',
      render: (allocs) => (
        <div className="flex flex-wrap gap-1.5 max-w-sm">
          {allocs.map((alloc, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold"
            >
              {alloc.leaveTypeId?.code || 'Type'}: {alloc.yearlyAllocation}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Assignments',
      key: 'assignments',
      render: (assigns) => {
        if (!assigns || assigns.length === 0) {
          return <span className="text-slate-400 text-xs italic">Unassigned</span>;
        }
        return (
          <div className="flex flex-col gap-0.5 text-xs text-slate-500 font-semibold">
            {assigns.map((a, idx) => {
              let targetLabel = '';
              if (a.type === 'company') {
                targetLabel = 'All Company';
              } else if (a.type === 'department') {
                const dept = departments.find((d) => d._id === a.targetId);
                targetLabel = dept ? `Dept: ${dept.name}` : 'Dept: Unknown';
              } else if (a.type === 'role') {
                const r = roles.find((t) => t._id === a.targetId);
                targetLabel = r ? `Role: ${r.roleName}` : 'Role: Unknown';
              }
              return <span key={idx}>• {targetLabel}</span>;
            })}
          </div>
        );
      },
    },
    {
      header: 'Status',
      key: 'status',
      render: (val, item) => (
        <button
          onClick={() => handleTogglePolicyStatus(item)}
          disabled={!canEdit}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            val === 'active'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
              : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100'
          } ${!canEdit ? 'pointer-events-none opacity-80' : ''}`}
        >
          {val === 'active' ? <FiCheckCircle /> : <FiXCircle />}
          {val === 'active' ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      header: 'Actions',
      key: '_id',
      render: (_, item) => (
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={FiBriefcase}
                onClick={() => openAssignModal(item)}
                className="text-indigo-600 hover:text-indigo-700 hover:border-indigo-200"
              >
                Assign
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={FiEdit}
                onClick={() => openEditPolicyModal(item)}
              >
                Edit
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Leave Policies</h2>
          <p className="text-slate-400 text-xs font-semibold mt-1">Manage leave allocations and assign policies to employees</p>
        </div>

        {canCreate && (
          <Button variant="primary" icon={FiPlus} onClick={openAddPolicyModal}>
            Create Policy
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
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
            />
          </div>

          <div className="flex gap-2 items-center w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-bold focus:outline-none focus:border-indigo-600 transition-all w-full sm:w-auto"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="!p-0 overflow-hidden">
        <Table
          columns={columns.filter((c) => c.key !== '_id' || canEdit)}
          data={filteredPolicies}
          loading={loading}
          emptyMessage="No leave policies found."
        />
      </Card>

      {/* Policy Add/Edit Modal */}
      <Modal
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        title={selectedPolicy ? 'Edit Leave Policy' : 'Create Leave Policy'}
        size="lg"
      >
        <form onSubmit={handlePolicySubmit} noValidate className="flex flex-col gap-4">
          {policyFormError && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl">
              {policyFormError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Policy Name"
                name="policyName"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                placeholder="Standard Corporate Policy"
                required
                error={policyFieldErrors.policyName}
              />
            </div>
            <div className="md:col-span-1">
              <Input
                type="select"
                label="Status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <Input
            type="textarea"
            label="Description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe policy details..."
          />

          {/* Allocation List Inputs */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3">
              Yearly Quota Allocations
            </h4>
            {policyFieldErrors.allocations && (
              <p className="text-xs text-rose-600 font-semibold mb-2">{policyFieldErrors.allocations}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl max-h-[200px] overflow-y-auto">
              {allocations.map((alloc, idx) => (
                <div key={alloc.leaveTypeId} className="flex items-center justify-between gap-3 bg-white p-3 border border-slate-150 rounded-xl">
                  <div>
                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-black uppercase mb-1">
                      {alloc.code}
                    </span>
                    <p className="text-xs font-bold text-slate-700">{alloc.name}</p>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      value={alloc.yearlyAllocation}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAllocations((prev) =>
                          prev.map((a, i) => (i === idx ? { ...a, yearlyAllocation: val } : a))
                        );
                      }}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:border-indigo-600 text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setPolicyModalOpen(false)} disabled={policyBtnLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={policyBtnLoading}>
              {selectedPolicy ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assignment Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Leave Policy"
        size="lg"
      >
        <form onSubmit={handleAssignSubmit} noValidate className="flex flex-col gap-4">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
            <p className="text-xs text-indigo-700 font-bold leading-relaxed">
              Assignments map this policy to employee roles. When assigned, leave balance ledgers are created or synced automatically for matching employees.
            </p>
          </div>

          {assignError && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl">
              {assignError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 tracking-wider uppercase">Assignment Rules</h4>
              <Button variant="outline" size="sm" icon={FiPlus} onClick={handleAddAssignmentRow}>
                Add Rule
              </Button>
            </div>

            {assignments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
                No assignment rules configured. This policy is currently unassigned.
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[240px] overflow-y-auto pr-1">
                {assignments.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-end bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <div className="flex-1">
                      <Input
                        type="select"
                        label="Target Role"
                        name={`assign-target-${idx}`}
                        value={row.targetId}
                        onChange={(e) => handleAssignmentRowChange(idx, 'targetId', e.target.value)}
                        options={roles.map((r) => ({ value: r._id, label: r.roleName }))}
                        placeholder="Select Role..."
                        required
                        error={!row.targetId && assignError ? 'Role selection is required.' : null}
                      />
                    </div>
                    <div>
                      <Button
                        variant="secondary"
                        size="md"
                        icon={FiTrash}
                        className="!text-rose-600 hover:!bg-rose-50 hover:!border-rose-100 !py-2.5"
                        onClick={() => handleRemoveAssignmentRow(idx)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)} disabled={assignBtnLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={assignBtnLoading}>
              Sync & Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeavePolicies;
