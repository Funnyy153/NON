'use client';

import { useState } from 'react';

interface FilterBarProps {
  onSearchChange: (searchTerm: string) => void;
  onStatusFilterChange: (filters: { checked: boolean; unchecked: boolean }) => void;
  showClosedCases?: boolean;
  onCloseCaseFilterChange?: (showClosed: boolean) => void;
  selectedUnit?: string;
  onUnitChange?: (unit: string) => void;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

const allUnits = [
  'เขตเลือกตั้งที่ 1 หน่วยที่ 1 อาคารโรงเรียนนนทบุรีวิทยาลัย',
  'เขตเลือกตั้งที่ 1 หน่วยที่ 2 อาคารโรงเรียนนนทบุรีวิทยาลัย',
  'เขตเลือกตั้งที่ 1 หน่วยที่ 3 อาคารโรงเรียนนนทบุรีวิทยาลัย',
  'เขตเลือกตั้งที่ 1 หน่วยที่ 4 อาคารโรงเรียนนนทบุรีวิทยาลัย',
  'เขตเลือกตั้งที่ 2 หน่วยที่ 1 ศาลาวัดสิงห์ทอง',
  'เขตเลือกตั้งที่ 3 หน่วยที่ 1 เต็นท์หน้าคริสตจักรเปนีเอลไทย',
  'เขตเลือกตั้งที่ 4 หน่วยที่ 1 เต็นท์หน้าโกดังเมืองทองเอสเตท',
  'เขตเลือกตั้งที่ 5 หน่วยที่ 1 เต็นท์ข้างบ้านป้าลำไพ เปรมจิตต์',
  'เขตเลือกตั้งที่ 6 หน่วยที่ 1 ศาลาโรงครัวริมน้ำ วัดใหญ่สว่างอารมณ์',
];

export default function FilterBar({ 
  onSearchChange, 
  onStatusFilterChange, 
  showClosedCases, 
  onCloseCaseFilterChange,
  selectedUnit,
  onUnitChange,
  selectedDate,
  onDateChange
}: FilterBarProps) {
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
    <div className="bg-orange-50 rounded-xl p-3 sm:p-4 shadow-md border-2 border-orange-200 mb-4 sm:mb-6 w-full">
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center w-full">
        {/* Search Input */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 flex-1 w-full">
          <label className="text-xs sm:text-sm font-semibold text-orange-800 whitespace-nowrap">
            ค้นหาหน่วยเลือกตั้ง :
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="พิมพ์ชื่อหน่วย..."
            className="w-full sm:flex-1 px-3 sm:px-4 py-2 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <label className="text-xs sm:text-sm font-semibold text-orange-800 whitespace-nowrap">
            กรองสถานะ :
          </label>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {/* ตรวจสอบแล้ว */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilters.checked}
                onChange={() => handleStatusFilterChange('checked')}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-orange-400 text-orange-600 cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-medium text-orange-900 whitespace-nowrap">
                ตรวจสอบแล้ว
              </span>
            </label>

            {/* ยังไม่ตรวจสอบ */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilters.unchecked}
                onChange={() => handleStatusFilterChange('unchecked')}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-orange-400 text-orange-600 cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-medium text-orange-900 whitespace-nowrap">
                ยังไม่ตรวจสอบ
              </span>
            </label>
          </div>
        </div>

        {/* Close Case Filter */}
        {showClosedCases !== undefined && onCloseCaseFilterChange && (
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="text-xs sm:text-sm font-semibold text-orange-800 whitespace-nowrap">
              ปิดเคส :
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showClosedCases}
                onChange={(e) => onCloseCaseFilterChange(e.target.checked)}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-orange-400 text-orange-600 cursor-pointer"
              />
            </label>
          </div>
        )}

        {/* Unit Filter */}
        {selectedUnit !== undefined && onUnitChange && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-xs sm:text-sm font-semibold text-orange-800 whitespace-nowrap">
              หน่วย :
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => onUnitChange(e.target.value)}
              className="px-3 sm:px-4 py-2 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm min-w-[200px]"
            >
              <option value="">ทั้งหมด</option>
              {allUnits.map((unit, index) => (
                <option key={index} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date Filter */}
        {selectedDate !== undefined && onDateChange && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-xs sm:text-sm font-semibold text-orange-800 whitespace-nowrap">
              วันที่ :
            </label>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => {
                const date = new Date(e.target.value);
                if (!isNaN(date.getTime())) {
                  onDateChange(date);
                }
              }}
              className="px-3 sm:px-4 py-2 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

