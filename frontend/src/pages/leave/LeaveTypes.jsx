import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { FiPlus, FiEdit, FiSearch, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/user.utils';

const LeaveTypes = () => {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [btnLoading, setBtnLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const canCreate = hasPermission(user, 'leaveType.create');
  const canEdit = hasPermission(user, 'leaveType.edit');

  const fetchLeaveTypes = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/leave/types');
      setLeaveTypes(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const validateForm = () => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName) {
      errors.name = 'Leave type name is required.';
    }
    if (!trimmedCode) {
      errors.code = 'Leave type code is required.';
    } else if (trimmedCode.length > 10) {
      errors.code = 'Code cannot exceed 10 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!validateForm()) return;

    setBtnLoading(true);
    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      status,
    };

    try {
      if (editItem) {
        await axiosClient.put(`/leave/types/${editItem._id}`, payload);
      } else {
        await axiosClient.post('/leave/types', payload);
      }
      setModalOpen(false);
      resetForm();
      fetchLeaveTypes();
    } catch (err) {
      const respData = err.response?.data;
      if (respData && respData.errors && Array.isArray(respData.errors)) {
        const mapped = {};
        respData.errors.forEach((fErr) => {
          mapped[fErr.field] = fErr.message;
        });
        setFieldErrors(mapped);
      } else {
        setFormError(extractErrorMessage(err));
      }
    } finally {
      setBtnLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setStatus('active');
    setEditItem(null);
    setFormError('');
    setFieldErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setName(item.name);
    setCode(item.code);
    setDescription(item.description || '');
    setStatus(item.status);
    setFormError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleToggleStatus = async (item) => {
    if (!canEdit) return;
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await axiosClient.put(`/leave/types/${item._id}`, { status: newStatus });
      fetchLeaveTypes();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  // Local Filter Logic
  const filteredData = leaveTypes.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === '' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: 'Code',
      key: 'code',
      render: (val) => (
        <span className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-black tracking-wider uppercase">
          {val}
        </span>
      ),
    },
    {
      header: 'Name',
      key: 'name',
      render: (val) => <span className="font-bold text-slate-800 text-sm">{val}</span>,
    },
    {
      header: 'Description',
      key: 'description',
      render: (val) => <span className="text-slate-400 text-xs font-medium max-w-xs block truncate">{val || '-'}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (val, item) => (
        <button
          onClick={() => handleToggleStatus(item)}
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
            <Button
              variant="outline"
              size="sm"
              icon={FiEdit}
              onClick={() => openEditModal(item)}
              className="text-indigo-600 hover:text-indigo-700 hover:border-indigo-200"
            >
              Edit
            </Button>
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Leave Types</h2>
          <p className="text-slate-400 text-xs font-semibold mt-1">Configure and manage leave categories for your company</p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            icon={FiPlus}
            onClick={openAddModal}
            className="md:self-end"
          >
            Create Leave Type
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
              placeholder="Search by code or name..."
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
          data={filteredData}
          loading={loading}
          emptyMessage="No leave types found matching your query."
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Leave Type' : 'Add Leave Type'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Input
                label="Code"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SL"
                required
                error={fieldErrors.code}
                disabled={!!editItem} // Code unique per company, disable on edit to avoid mismatches
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sick Leave"
                required
                error={fieldErrors.name}
              />
            </div>
          </div>

          <Input
            type="textarea"
            label="Description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the leave type rules..."
            error={fieldErrors.description}
          />

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

          <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={btnLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={btnLoading}>
              {editItem ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveTypes;
