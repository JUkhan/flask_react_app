import React, { useState, useEffect } from 'react';
import { Edit2, X, ChevronLeft, ChevronRight, GripVertical, Settings } from 'lucide-react';

import { useComponentData } from './useComponentData';

const ColumnNameDragAndDrop = ({ isOpen, onClose, columns, onSave }) => {

  const [localColumns, setLocalColumns] = useState(columns);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newColumns = [...localColumns];
    const draggedItem = newColumns[draggedIndex];
    
    // Remove dragged item
    newColumns.splice(draggedIndex, 1);
    
    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newColumns.splice(insertIndex, 0, draggedItem);
    
    setLocalColumns(newColumns);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const handleReset = () => {
    setLocalColumns(columns);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Reorder Columns</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop to reorder columns. Changes will be applied when you save.
          </p>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {localColumns.map((column, index) => (
              <div
                key={`${column}-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center p-3 bg-gray-50 rounded-lg border cursor-move transition-all ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverIndex === index ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <GripVertical size={16} className="text-gray-400 mr-3" />
                <span className="flex-1 text-sm font-medium text-gray-800">
                  {column}
                </span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const Pager = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  if (totalPages <= 1) return null;

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate start and end of middle section
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Add ellipsis if needed
      if (start > 2) {
        pages.push('...');
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      // Add ellipsis if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200 rounded-bl-lg rounded-br-lg">
      {/* Mobile view */}
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      
      {/* Desktop view */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex}</span> to{' '}
            <span className="font-medium">{endIndex}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          
          {renderPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-sm font-medium text-gray-700">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(page)}
                  className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const TableComponent = ({ id, title, onRemove, onEdit, columns, data, query, itemsPerPage = 3, onColumnsChange, json_config, isQueryEditable, onToggleQueryEditable }) => {
  const xdata = useComponentData(query, data);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentColumns, setCurrentColumns] = useState(columns);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState(null);

  // Get configuration from json_config or use defaults
  const config = json_config?.table || {
    showPagination: true,
    pageSize: 10,
    stripedRows: true,
    showBorders: true,
    hoverEffect: true,
    denseLayout: false,
    headerStyle: 'default',
    headerColor: '#3b82f6'
  };

  const effectivePageSize = config.pageSize || itemsPerPage;

  // Update columns when prop changes
  useEffect(() => {
    setCurrentColumns(columns);
  }, [columns]);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [xdata]);

  // Calculate pagination values
  const totalItems = xdata.length;
  const totalPages = Math.ceil(totalItems / effectivePageSize);
  
  // Get current page data
  const currentPageData = xdata.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize
  );
  
  
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleColumnsChange = (newColumns) => {
    setCurrentColumns(newColumns);
    if (onColumnsChange) {
      onColumnsChange(id, newColumns);
    }
  };

  // Drag and drop handlers for column reordering
  const handleDragStart = (e, index) => {
    // Stop propagation to prevent grid layout from interfering
    e.stopPropagation();
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
    // Add a visual effect
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumnIndex(index);
  };

  const handleDragLeave = (e) => {
    e.stopPropagation();
    setDragOverColumnIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedColumnIndex === null || draggedColumnIndex === dropIndex) {
      setDraggedColumnIndex(null);
      setDragOverColumnIndex(null);
      return;
    }

    const newColumns = [...currentColumns];
    const draggedColumn = newColumns[draggedColumnIndex];

    // Remove dragged column
    newColumns.splice(draggedColumnIndex, 1);

    // Insert at new position
    const insertIndex = draggedColumnIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newColumns.splice(insertIndex, 0, draggedColumn);

    handleColumnsChange(newColumns);
    setDraggedColumnIndex(null);
    setDragOverColumnIndex(null);
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    e.currentTarget.style.opacity = '1';
    setDraggedColumnIndex(null);
    setDragOverColumnIndex(null);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg relative group">
      <div className="flex justify-between items-center mb-4 p-6 pb-0">
        <div className="flex items-center gap-2">
          <div className="drag-handle cursor-move opacity-50 hover:opacity-100 transition-opacity">
            <GripVertical size={20} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleQueryEditable && onToggleQueryEditable(id)}
            className={`p-1 transition-colors ${
              isQueryEditable
                ? 'text-red-500 hover:text-red-700'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Toggle query editing"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => onEdit(id, title)}
            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
            title="Edit component"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onRemove(id)}
            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
            title="Remove component"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Pagination Controls (Top) */}
      {config.showPagination && xdata.length > 0 && (
        <div className="flex justify-between items-center mb-4 px-6" onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show</span>
            <select
              value={effectivePageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                // Update config via parent if needed
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-sm text-gray-700">entries</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto px-6" onMouseDown={(e) => e.stopPropagation()}>
        <table className={`min-w-full ${config.showBorders ? 'divide-y divide-gray-200' : ''}`}>
          <thead className={`${
            config.headerStyle === 'colored'
              ? 'text-white'
              : 'bg-gray-50'
          } ${config.headerStyle === 'bold' ? 'font-bold' : ''}`}
          style={config.headerStyle === 'colored' ? { backgroundColor: config.headerColor } : {}}>
            <tr>
              {currentColumns.map((col, index) => (
                <th
                  key={index}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`${config.denseLayout ? 'px-4 py-2' : 'px-6 py-3'} text-left text-xs ${config.headerStyle === 'bold' ? 'font-bold' : 'font-medium'} uppercase tracking-wider cursor-move select-none transition-colors ${
                    draggedColumnIndex === index ? 'bg-blue-200' :
                    dragOverColumnIndex === index ? 'bg-blue-100' :
                    config.headerStyle === 'colored' ? '' : 'text-gray-500'
                  }`}
                  title="Drag to reorder columns"
                >
                  <div className="flex items-center space-x-1">
                    <span>{col}</span>
                    <svg
                      className="w-3 h-3 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                    </svg>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`bg-white ${config.showBorders ? 'divide-y divide-gray-200' : ''}`}>
            {currentPageData.map((row, rowIndex) => (
              <tr key={row[currentColumns[0]] + rowIndex} className={`${
                config.stripedRows && rowIndex % 2 === 1 ? 'bg-gray-50' : ''
              } ${config.hoverEffect ? 'hover:bg-gray-100' : ''}`}>
                {currentColumns.map((col, idx) => (
                  <td key={idx} className={`${config.denseLayout ? 'px-4 py-2' : 'px-6 py-4'} whitespace-nowrap text-sm text-gray-500`}>
                    {row[col] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {config.showPagination && totalPages > 1 && (
        <div onMouseDown={(e) => e.stopPropagation()}>
          <Pager
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={effectivePageSize}
          />
        </div>
      )}

      {xdata.length === 0 && (
        <div className="text-center py-8 px-6">
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </div>
  );
}
export default TableComponent;