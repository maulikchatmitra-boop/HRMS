import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Input from '../../components/Input';
import { FiCalendar } from 'react-icons/fi';

const EmployeeHolidays = () => {
  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
    fetchHolidays();
  }, [year]);

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
          <span>{new Date(val).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
        </span>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      render: (val) => val || <span className="text-slate-400 font-medium italic">No description</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Organization Holidays</h2>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            Yearly schedule of holiday days-off
          </p>
        </div>
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
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      <Card>
        <Table
          columns={columns}
          data={holidays}
          loading={loading}
          emptyMessage={`No holidays registered for the year ${year}.`}
        />
      </Card>
    </div>
  );
};

export default EmployeeHolidays;
