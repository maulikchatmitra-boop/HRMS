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

const Designations = () => {
  const { user } = useAuth();
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal forms
  const [modalOpen, setModalOpen] = useState(false);
  const [editDesig, setEditDesig] = useState(null);
  const [title, setTitle] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const canCreate = hasPermission(user, 'designation.create');
  const canEdit = hasPermission(user, 'designation.edit');
  const canDelete = hasPermission(user, 'designation.delete');

  const fetchDesignations = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/designations');
      setDesignations(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!title.trim()) {
      setFieldErrors({ title: 'Designation title is required.' });
      return;
    }

    setBtnLoading(true);

    try {
      if (editDesig) {
        await axiosClient.put(`/designations/${editDesig._id}`, { title });
      } else {
        await axiosClient.post('/designations', { title });
      }
      setModalOpen(false);
      setTitle('');
      setEditDesig(null);
      fetchDesignations();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) return;

    try {
      await axiosClient.delete(`/designations/${id}`);
      fetchDesignations();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const openModal = (desig = null) => {
    setEditDesig(desig);
    setTitle(desig ? desig.title : '');
    setFormError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const columns = [
    {
      header: 'Designation Title',
      key: 'title',
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Designations</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Define employment designations and job titles
          </p>
        </div>
        {canCreate && (
          <Button icon={FiPlus} onClick={() => openModal()}>
            New Designation
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
          data={designations}
          loading={loading}
          emptyMessage="No designations configured yet."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setFieldErrors({}); }}
        title={editDesig ? 'Edit Designation' : 'Create Designation'}
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Designation Title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Senior Software Architect"
            error={fieldErrors.title}
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

export default Designations;
