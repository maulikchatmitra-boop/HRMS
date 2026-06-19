import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { FiPlus, FiEdit, FiTrash2, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, formatDateDisplay } from '../../utils/user.utils';

const Holidays = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal forms
  const [modalOpen, setModalOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const canCreate = hasPermission(user, 'holiday.create');
  const canEdit = hasPermission(user, 'holiday.edit');
  const canDelete = hasPermission(user, 'holiday.delete');

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/holidays?year=${year}`);
      setHolidays(res.data.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const validateHolidayForm = () => {
    const errors = {};
    const trimmedName = name ? name.trim() : '';
    const trimmedDesc = description ? description.trim() : '';

    if (!trimmedName) {
      errors.name = 'Holiday name is required.';
    } else if (trimmedName.length < 3) {
      errors.name = 'Holiday name must be at least 3 characters.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Holiday name cannot exceed 100 characters.';
    } else if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      errors.name = 'Holiday name can only contain letters, spaces, hyphens, and apostrophes.';
    }

    if (!date) {
      errors.date = 'Holiday date is required.';
    } else {
      const selectedYear = new Date(date).getFullYear().toString();
      if (selectedYear !== year) {
        errors.date = `Holiday date must be in the year ${year}.`;
      }
    }

    if (trimmedDesc && trimmedDesc.length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!validateHolidayForm()) {
      return;
    }

    setBtnLoading(true);

    try {
      const payload = { name: name.trim(), date, description: description.trim() };
      if (editHoliday) {
        await axiosClient.put(`/holidays/${editHoliday._id}`, payload);
      } else {
        await axiosClient.post('/holidays', payload);
      }
      setModalOpen(false);
      setName('');
      setDate('');
      setDescription('');
      setEditHoliday(null);
      fetchHolidays();
    } catch (err) {
      const respData = err.response?.data;
      if (respData && respData.errors && Array.isArray(respData.errors) && respData.errors.length > 0) {
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await axiosClient.delete(`/holidays/${id}`);
      fetchHolidays();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const openModal = (holiday = null) => {
    setEditHoliday(holiday);
    setName(holiday ? holiday.name : '');
    setDate(holiday ? holiday.date.substring(0, 10) : '');
    setDescription(holiday ? holiday.description || '' : '');
    setFormError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  const columns = [
    {
      header: 'Holiday Name',
      key: 'name',
      render: (val) => <span className="font-bold text-slate-800">{val}</span>,
    },
    {
      header: 'Date',
      key: 'date',
      render: (val) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
          <FiCalendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>{formatDateDisplay(val)}</span>
        </span>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      render: (val) => val || <span className="text-slate-400 font-medium italic">No description</span>,
    },
  ];

  if (canEdit || canDelete) {
    columns.push({
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
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Holidays Calendar</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Manage holiday schedule and organization days-off
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            name="yearSelect"
            type="select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={[
              { label: '2025', value: '2025' },
              { label: '2026', value: '2026' },
              { label: '2027', value: '2027' },
              { label: '2028', value: '2028' },
            ]}
            className="w-28 text-sm"
          />
          {canCreate && (
            <Button icon={FiPlus} onClick={() => openModal()}>
              New Holiday
            </Button>
          )}
        </div>
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
          data={holidays}
          loading={loading}
          emptyMessage={`No holidays registered for the year ${year}.`}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editHoliday ? 'Edit Holiday' : 'Create Holiday'}
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-4">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Holiday Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. New Year's Day"
            error={fieldErrors.name}
          />
          <Input
            label="Date"
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            error={fieldErrors.date}
          />
          <Input
            label="Description"
            name="description"
            type="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details..."
            error={fieldErrors.description}
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

export default Holidays;
