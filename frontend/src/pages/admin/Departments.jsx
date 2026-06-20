import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, formatDateDisplay } from '../../utils/user.utils';

const Departments = () => {
  const { user } = useAuth();
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal forms
  const [modalOpen, setModalOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [name, setName] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const canCreate = hasPermission(user, 'department.create');
  const canEdit = hasPermission(user, 'department.edit');
  const canDelete = hasPermission(user, 'department.delete');

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/departments');
      setDepts(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: 'Department name is required.' });
      return;
    }

    setBtnLoading(true);

    try {
      if (editDept) {
        await axiosClient.put(`/departments/${editDept._id}`, { name });
      } else {
        await axiosClient.post('/departments', { name });
      }
      setModalOpen(false);
      setName('');
      setEditDept(null);
      fetchDepts();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;

    try {
      await axiosClient.delete(`/departments/${id}`);
      fetchDepts();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const openModal = (dept = null) => {
    setEditDept(dept);
    setName(dept ? dept.name : '');
    setFormError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const columns = [
    {
      header: 'Department Name',
      key: 'name',
      render: (val) => <span className="font-bold text-slate-800">{val}</span>,
    },
    {
      header: 'Created At',
      key: 'createdAt',
      render: (val) => (val ? formatDateDisplay(val) : '-'),
    },
    {
      header: 'Actions',
      key: '_id',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              icon={FiEdit}
              onClick={() => openModal(row)}
            >
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="danger"
              size="sm"
              icon={FiTrash2}
              onClick={() => handleDelete(val)}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Departments</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Configure business departments and groups
          </p>
        </div>
        {canCreate && (
          <Button icon={FiPlus} onClick={() => openModal()}>
            New Department
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      <Card>
        <Table
          columns={columns.filter(col => {
            if (col.header === 'Actions' && !canEdit && !canDelete) return false;
            return true;
          })}
          data={depts}
          loading={loading}
          emptyMessage="No departments configured yet."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setFieldErrors({}); }}
        title={editDept ? 'Edit Department' : 'Create Department'}
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Department Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Research & Development"
            error={fieldErrors.name}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setFieldErrors({}); }}>
              Cancel
            </Button>
            <Button type="submit" loading={btnLoading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Departments;
