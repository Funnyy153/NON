'use client';

import { useState } from 'react';

interface FilterBarProps {
  onSearchChange: (searchTerm: string) => void;
  onStatusFilterChange: (filters: { checked: boolean; unchecked: boolean }) => void;
  showClosedCases?: boolean;
  onCloseCaseFilterChange?: (showClosed: boolean) => void;
}

export default function FilterBar({ onSearchChange, onStatusFilterChange, showClosedCases, onCloseCaseFilterChange }: FilterBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState({
    checked: true,
    unchecked: true,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearchChange(value);
  };

  const handleStatusFilterChange = (type: 'checked' | 'unchecked') => {
    const newFilters = {
      ...statusFilters,
      [type]: !statusFilters[type],
    };
    
    // ถ้าทั้งสองอันถูก uncheck ให้ check อันที่ถูกคลิกกลับ
    if (!newFilters.checked && !newFilters.unchecked) {
      newFilters[type] = true;
    }
    
    setStatusFilters(newFilters);
    onStatusFilterChange(newFilters);
  };


  return (
    <div className="bg-orange-50 rounded-xl p-4 shadow-md border-2 border-orange-200 mb-6 w-full">
      <div className="flex flex-row gap-4 items-center w-full">
        {/* Search Input */}
        <div className="flex items-center gap-3 flex-1">
          <label className="text-sm font-semibold text-orange-800 whitespace-nowrap">
            ค้นหาหน่วยเลือกตั้ง :
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="พิมพ์ชื่อหน่วย..."
            className="flex-1 px-4 py-2 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-orange-800 whitespace-nowrap">
            กรองสถานะ :
          </label>
          <div className="flex gap-4">
            {/* ตรวจสอบแล้ว */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilters.checked}
                onChange={() => handleStatusFilterChange('checked')}
                className="w-5 h-5 rounded-md border-2 border-orange-400 text-orange-600 cursor-pointer"
              />
              <span className="text-sm font-medium text-orange-900 whitespace-nowrap">
                ตรวจสอบแล้ว
              </span>
            </label>

            {/* ยังไม่ตรวจสอบ */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilters.unchecked}
                onChange={() => handleStatusFilterChange('unchecked')}
                className="w-5 h-5 rounded-md border-2 border-orange-400 text-orange-600 cursor-pointer"
              />
              <span className="text-sm font-medium text-orange-900 whitespace-nowrap">
                ยังไม่ตรวจสอบ
              </span>
            </label>
          </div>
        </div>

        {/* Close Case Filter */}
        {showClosedCases !== undefined && onCloseCaseFilterChange && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-orange-800 whitespace-nowrap">
              ปิดเคส :
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showClosedCases}
                onChange={(e) => onCloseCaseFilterChange(e.target.checked)}
                className="w-5 h-5 rounded-md border-2 border-orange-400 text-orange-600 cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

