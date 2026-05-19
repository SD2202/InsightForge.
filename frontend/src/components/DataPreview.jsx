import React, { useState, useMemo } from 'react';

export default function DataPreview({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center text-center h-64">
        <div className="text-4xl mb-3 opacity-50">📋</div>
        <p className="text-charcoal font-medium">No data available for preview.</p>
      </div>
    );
  }

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const columns = Object.keys(data[0]);

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle nulls
        if (aVal === null || aVal === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortConfig.direction === 'asc' ? -1 : 1;

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const currentData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-bg">
        <h3 className="section-title text-base m-0">Interactive Data View</h3>
        <span className="stat-badge">
          {data.length} Total Rows
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="data-table border-none">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  onClick={() => requestSort(col)}
                  className="cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortConfig.key === col ? (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    ) : (
                      <span className="opacity-20 hover:opacity-100">↕</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} title={String(row[col])}>
                    {typeof row[col] === 'number' && !Number.isInteger(row[col]) 
                      ? Number(row[col]).toFixed(4) 
                      : String(row[col] ?? 'N/A')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-brand-gray flex justify-between items-center text-sm font-bold text-white border-t border-white/10">
        <div className="text-white/60 font-medium">
          Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, data.length)} of {data.length}
        </div>
        <div className="flex gap-2">
          <button 
            className="btn-secondary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            Prev
          </button>
          <button 
            className="btn-secondary py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
