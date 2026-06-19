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

const Branches = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canCreate = hasPermission(user, 'branch.create');
  const canEdit = hasPermission(user, 'branch.edit');
  const canDelete = hasPermission(user, 'branch.delete');

  // Modal forms
  const [modalOpen, setModalOpen] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [name, setName] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/branches');
      setBranches(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setBtnLoading(true);

    try {
      if (editBranch) {
        await axiosClient.put(`/branches/${editBranch._id}`, { name });
      } else {
        await axiosClient.post('/branches', { name });
      }
      setModalOpen(false);
      setName('');
      setEditBranch(null);
      fetchBranches();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;

    try {
      await axiosClient.delete(`/branches/${id}`);
      fetchBranches();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const openModal = (branch = null) => {
    setEditBranch(branch);
    setName(branch ? branch.name : '');
    setFormError('');
    setModalOpen(true);
  };

  const columns = [
    {
      header: 'Branch Name',
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Branches</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Manage company branches and geographic locations
          </p>
        </div>
        {canCreate && (
          <Button icon={FiPlus} onClick={() => openModal()}>
            New Branch
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
          data={branches}
          loading={loading}
          emptyMessage="No branches configured yet."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editBranch ? 'Edit Branch' : 'Create Branch'}
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Branch Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. London Office"
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
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

export default Branches;
