import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { FiSearch } from 'react-icons/fi';

const ManagerEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Filters
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);

      const res = await axiosClient.get(`/employees/list?${params.toString()}`);
      setEmployees(res.data.data.users || res.data.data.employees || res.data.data || []);
      setPagination(res.data.data.pagination || res.data.pagination);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  const columns = [
    {
      header: 'Employee Name',
      key: 'firstName',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <img src={row.avatar} alt={val} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              {((row.firstName?.[0] || '') + (row.lastName?.[0] || '')).toUpperCase() || 'EMP'}
            </div>
          )}
          <div>
            <p className="font-bold text-slate-700">{row.firstName} {row.lastName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Department / Designation',
      key: 'department',
      render: (_, row) => (
        <div>
          <p className="text-xs font-bold text-slate-700">{row.department?.name || '-'}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{row.designation?.title || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Shift Timing',
      key: 'shift',
      render: (val) => (
        <span className="text-xs text-slate-500 font-medium">
          {val ? `${val.name} (${val.startTime}-${val.endTime})` : '-'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
          val === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
        }`}>
          {val}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Team Registry</h2>
        <p className="text-slate-400 text-xs mt-1 font-semibold">
          Workplace directory list (Read-Only access)
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 card-shadow p-5">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 w-full">
          <Input
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email..."
            className="flex-1"
          />
          <Button type="submit" icon={FiSearch} variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      <Card>
        <Table
          columns={columns}
          data={employees}
          pagination={pagination}
          onPageChange={setPage}
          loading={loading}
          emptyMessage="No workspace employees found."
        />
      </Card>
    </div>
  );
};

export default ManagerEmployees;
