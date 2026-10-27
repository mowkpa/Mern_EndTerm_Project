import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import EmptyState from './EmptyState';

export const DataTable = ({
  columns = [],
  data = [],
  keyField = '_id',
  emptyTitle = 'No records found',
  emptyDescription = 'There is no data to display.',
  className = '',
}) => {
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [data, sortField, sortOrder]);

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div
      className={`w-full overflow-hidden border border-line rounded-panel bg-surface ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-paper border-b border-line sticky top-0 z-10">
            <tr>
              {columns.map((col) => {
                const isSortable = !!col.sortable;
                const isSorted = sortField === col.field;

                return (
                  <th
                    key={col.field || col.header}
                    scope="col"
                    onClick={() => isSortable && handleSort(col.field)}
                    className={`px-4 py-3 text-xs font-semibold text-text-2 tracking-wide uppercase select-none ${
                      isSortable ? 'cursor-pointer hover:text-ink' : ''
                    } ${col.headerClassName || ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className="text-text-2/60">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-mine" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-mine" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sortedData.map((row, index) => (
              <tr
                key={row[keyField] || index}
                className="hover:bg-paper/50 transition-colors duration-100"
              >
                {columns.map((col) => (
                  <td
                    key={col.field || col.header}
                    className={`px-4 py-3 text-sm text-ink ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(row) : row[col.field]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
