import React, { useEffect, useState } from 'react';
import axiosClient, { extractErrorMessage } from '../../api/axiosClient';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Spinner from '../../components/Spinner';
import { formatDateTimeDisplay } from '../../utils/user.utils';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/audit-logs?page=${page}&limit=20`);
      setLogs(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const columns = [
    {
      header: 'Performed By',
      key: 'user',
      render: (val, row) => {
        if (!row.userId) return <span className="text-slate-400 font-medium">System</span>;
        const name = `${row.userId.firstName || ''} ${row.userId.lastName || ''}`.trim();
        return (
          <div>
            <p className="font-bold text-slate-700">{name || 'User'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{row.userId.email}</p>
          </div>
        );
      },
    },
    {
      header: 'Action',
      key: 'action',
      render: (val) => <span className="font-bold text-indigo-600 text-xs uppercase bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-lg">{val}</span>,
    },

    {
      header: 'Timestamp',
      key: 'createdAt',
      render: (val) => (val ? formatDateTimeDisplay(val) : '-'),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Audit Trail</h2>
        <p className="text-slate-400 text-xs mt-1 font-semibold">
          Real-time tracking of platform administrative events
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      <Card>
        <Table
          columns={columns}
          data={logs}
          pagination={pagination}
          onPageChange={setPage}
          loading={loading}
          emptyMessage="No audit trails recorded."
        />
      </Card>
    </div>
  );
};

export default AuditLogs;
