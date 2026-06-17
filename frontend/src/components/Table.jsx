import React from 'react';
import Spinner from './Spinner';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Table = ({
  columns = [],
  data = [],
  pagination = null,
  onPageChange,
  loading = false,
  emptyMessage = 'No data available',
}) => {
  return (
    <div className="w-full">
      <div className="table-container relative min-h-[150px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
            <Spinner size="md" />
          </div>
        )}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="table-header">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-slate-400 font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr key={item._id || rowIdx} className="table-row">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="table-cell">
                      {col.render ? col.render(item[col.key], item, rowIdx) : item[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2 py-1 text-sm text-slate-500 font-medium">
          <div>
            Showing page <span className="font-semibold text-slate-700">{pagination.page}</span> of{' '}
            <span className="font-semibold text-slate-700">{pagination.pages}</span> (Total{' '}
            <span className="font-semibold text-slate-700">{pagination.total}</span> entries)
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
              .filter((p) => {
                // Show pages around current page
                return Math.abs(p - pagination.page) <= 1 || p === 1 || p === pagination.pages;
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-2 text-slate-400">...</span>}
                    <button
                      onClick={() => onPageChange(p)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        pagination.page === p
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
