import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { formatTime12h, formatDateDisplay } from '../../utils/user.utils';

import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/user.utils';

const Shifts = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canCreate = hasPermission(user, 'shift.create');
  const canEdit = hasPermission(user, 'shift.edit');
  const canDelete = hasPermission(user, 'shift.delete');

  // Modal forms
  const [modalOpen, setModalOpen] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/shifts');
      setShifts(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setBtnLoading(true);

    try {
      const payload = { name, startTime, endTime };
      if (editShift) {
        await axiosClient.put(`/shifts/${editShift._id}`, payload);
      } else {
        await axiosClient.post('/shifts', payload);
      }
      setModalOpen(false);
      setName('');
      setStartTime('');
      setEndTime('');
      setEditShift(null);
      fetchShifts();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;

    try {
      await axiosClient.delete(`/shifts/${id}`);
      fetchShifts();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const openModal = (shift = null) => {
    setEditShift(shift);
    setName(shift ? shift.name : '');
    setStartTime(shift ? shift.startTime : '');
    setEndTime(shift ? shift.endTime : '');
    setFormError('');
    setModalOpen(true);
  };

  const columns = [
    {
      header: 'Shift Name',
      key: 'name',
      render: (val) => <span className="font-bold text-slate-800">{val}</span>,
    },
    {
      header: 'Timings',
      key: '_id',
      render: (_, row) => (
        <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-xs">
          {formatTime12h(row.startTime)} &ndash; {formatTime12h(row.endTime)}
        </span>
      ),
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Shifts</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Define daily shift schedules and work hours
          </p>
        </div>
        {canCreate && (
          <Button icon={FiPlus} onClick={() => openModal()}>
            New Shift
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
          data={shifts}
          loading={loading}
          emptyMessage="No shifts configured yet."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editShift ? 'Edit Shift' : 'Create Shift'}
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Shift Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Regular Day Shift"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              name="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label="End Time"
              name="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
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

export default Shifts;
