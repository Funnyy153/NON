'use client';

import { useEffect, useState } from 'react';
import { fetchSheetData } from '../lib/sheetsApi';

interface SheetRow {
  [key: string]: string;
}

interface DashboardStats {
  beforeBox: {
    reported: number;
    total: number;
    problems: number;
    completed: number;
    statusSquares: ('reject' | 'green' | 'orange' | 'red')[];
  };
  afterCount: {
    reported: number;
    total: number;
    problems: number;
    completed: number;
    statusSquares: ('reject' | 'green' | 'orange' | 'red')[];
  };
  abnormal: {
    total: number;
    checked: number;
    remaining: number;
    newInHour: number;
    statusSquares: ('green' | 'yellow' | 'orange' | 'red')[];
  };
  top3Problems: string[]; // Just unit names
  unitTimelines: Array<{
    unit: string;
    timeline: {
      beforeOpen: number;
      openBox: number;
      votingPeriod: Array<{value: number; count: number; timeRange: string}>; // Array of 3 segments (เส้นละ 3 ชั่วโมง)
      votingTotal: number;
      closeBox: number;
      countingPeriod: Array<{value: number; count: number; timeRange: string; label: string}>; // Array of 2 segments
      countingTotal: number;
      countComplete: number;
    };
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for selected date (default to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Helper function to check if a date is on the selected date (using local date, ignoring timezone)
  const isSameDate = (date1: Date, date2: Date): boolean => {
    const d1Year = date1.getFullYear();
    const d1Month = date1.getMonth();
    const d1Date = date1.getDate();
    
    const d2Year = date2.getFullYear();
    const d2Month = date2.getMonth();
    const d2Date = date2.getDate();
    
    return d1Year === d2Year && d1Month === d2Month && d1Date === d2Date;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch data from all three sheets
        const [sheets1Data, sheets2Data, sheets3Data] = await Promise.all([
          fetchSheetData('sheets'),
          fetchSheetData('sheets2'),
          fetchSheetData('sheets3'),
        ]);

        // Filter data by selected date
        const beforeDataRaw = sheets1Data.data || [];
        const afterDataRaw = sheets2Data.data || [];
        const abnormalDataRaw = sheets3Data.data || [];

        // Get headers first to filter by date
        const beforeHeaders = beforeDataRaw.length > 0 ? Object.keys(beforeDataRaw[0]) : [];
        const afterHeaders = afterDataRaw.length > 0 ? Object.keys(afterDataRaw[0]) : [];
        const abnormalHeaders = abnormalDataRaw.length > 0 ? Object.keys(abnormalDataRaw[0]) : [];
        
        const beforeTimestampHeader = beforeHeaders.find(h => h.toLowerCase().includes('timestamp')) || '';
        const afterTimestampHeader = afterHeaders.find(h => h.toLowerCase().includes('timestamp')) || '';
        const abnormalTimestampHeader = abnormalHeaders.find(h => h.toLowerCase().includes('timestamp')) || '';
        const abnormalUnitHeader = abnormalHeaders.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
        
        // After data headers
        const afterStatusHeader = afterHeaders.find(h => h.includes('สถานะ') || h.toLowerCase().includes('status')) || '';
        const afterRejectHeader = afterHeaders.find(h => h.includes('reject') || h.includes('ปฏิเสธ') || h.toLowerCase().includes('reject')) || '';
        const afterUnitHeader = afterHeaders.find(h => h.includes('หน่วยเลือกตั้ง')) || '';

        // Filter data by selected date (strict date matching)
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();
        const selectedDay = selectedDate.getDate();
        
        console.log(`[Dashboard] Filtering data for date: ${selectedYear}-${selectedMonth + 1}-${selectedDay}`);
        console.log(`[Dashboard] Raw data counts - beforeDataRaw: ${beforeDataRaw.length}, afterDataRaw: ${afterDataRaw.length}, abnormalDataRaw: ${abnormalDataRaw.length}`);
        
        const filterByDate = (data: SheetRow[], timestampHeader: string, dataType: string): SheetRow[] => {
          if (!timestampHeader) {
            console.log(`[${dataType}] No timestamp header found`);
            return [];
          }
          
          const filtered = data.filter((row: SheetRow) => {
            const timestamp = row[timestampHeader] || '';
            if (!timestamp || timestamp.trim() === '') return false;
            
            try {
              // Parse timestamp - could be in format "M/D/YYYY HH:MM:SS" or ISO string
              let reportDate: Date;
              
              // Try parsing as MM/DD/YYYY HH:MM:SS format (from Google Sheets)
              const dateMatch = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
              if (dateMatch) {
                const [, month, day, year, hours, minutes, seconds] = dateMatch;
                reportDate = new Date(
                  parseInt(year),
                  parseInt(month) - 1, // Month is 0-indexed
                  parseInt(day),
                  parseInt(hours),
                  parseInt(minutes),
                  parseInt(seconds)
                );
              } else {
                // Try standard Date parsing
                reportDate = new Date(timestamp);
              }
              
              // Check if date is valid
              if (isNaN(reportDate.getTime())) return false;
              
              // Compare using local date components (ignore timezone)
              const reportYear = reportDate.getFullYear();
              const reportMonth = reportDate.getMonth();
              const reportDay = reportDate.getDate();
              
              const matches = reportYear === selectedYear && 
                             reportMonth === selectedMonth && 
                             reportDay === selectedDay;
              
              // Debug: ตรวจสอบข้อมูลเวลา 17:42 หรือข้อมูลที่ถูกกรองออก
              if (reportDate.getHours() === 17 && reportDate.getMinutes() === 42) {
                console.log(`[${dataType}] Found 17:42 data:`, {
                  timestamp,
                  reportDate: reportDate.toString(),
                  reportYear,
                  reportMonth: reportMonth + 1,
                  reportDay,
                  selectedYear,
                  selectedMonth: selectedMonth + 1,
                  selectedDay,
                  matches
                });
              }
              
              // Debug: แสดงข้อมูลที่ถูกกรองออก (ไม่ตรงกับวันที่ที่เลือก)
              if (!matches) {
                console.log(`[${dataType}] Filtered out: ${timestamp} (Report Date: ${reportYear}-${reportMonth + 1}-${reportDay}) vs Selected Date: ${selectedYear}-${selectedMonth + 1}-${selectedDay}`);
              }
              
              return matches;
            } catch (e) {
              console.error(`[${dataType}] Error parsing date:`, timestamp, e);
              return false;
            }
          });
          
          console.log(`[${dataType}] Filtered ${filtered.length} rows from ${data.length} total rows for date ${selectedYear}-${selectedMonth + 1}-${selectedDay}`);
          if (filtered.length > 0 && filtered.length <= 5) {
            console.log(`[${dataType}] Sample timestamps:`, filtered.map(r => r[timestampHeader]));
          }
          
          return filtered;
        };
        
        const beforeData = filterByDate(beforeDataRaw, beforeTimestampHeader, 'beforeData');
        const afterData = filterByDate(afterDataRaw, afterTimestampHeader, 'afterData');
        const abnormalData = filterByDate(abnormalDataRaw, abnormalTimestampHeader, 'abnormalData');
        
        console.log(`[Dashboard] After date filter - beforeData: ${beforeData.length}, afterData: ${afterData.length}, abnormalData: ${abnormalData.length}`);

        // Process before box opening data (sheets)
        // beforeHeaders already defined above
        const statusHeader = beforeHeaders.find(h => h.includes('สถานะ') || h.toLowerCase().includes('status')) || '';
        const rejectHeader = beforeHeaders.find(h => h.includes('reject') || h.includes('ปฏิเสธ') || h.toLowerCase().includes('reject')) || '';
        const unitHeader = beforeHeaders.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
        
        // กรองข้อมูลให้เหลือแค่ข้อมูลล่าสุดของแต่ละหน่วย (เหมือน SheetData.tsx)
        const beforeUnitMap = new Map<string, { row: SheetRow; index: number; timestamp: string }>();
        
        beforeData.forEach((row: SheetRow, index: number) => {
          const unit = row[unitHeader] || '';
          const timestamp = row[beforeTimestampHeader] || '';
          
          // ตรวจสอบว่าแถวมีข้อมูลจริงๆ (เหมือน SheetData.tsx)
          // ต้องมีชื่อหน่วย และต้องมี timestamp หรือมีข้อมูลอื่นๆ อย่างน้อย 3 คอลัมน์ (ไม่นับชื่อหน่วยและ timestamp)
          const hasTimestamp = timestamp && timestamp.trim() !== '';
          const otherDataCount = Object.entries(row).filter(([key, val]) => {
            // ข้ามชื่อหน่วยและ timestamp
            if (key === unitHeader || key === beforeTimestampHeader) return false;
            // ตรวจสอบว่ามีข้อมูลที่ไม่ใช่ค่าว่าง
            const value = val && typeof val === 'string' ? val.trim() : '';
            return value !== '';
          }).length;
          
          // ข้ามแถวที่ไม่มีข้อมูลจริงๆ (ไม่มี timestamp และไม่มีข้อมูลอื่นๆ อย่างน้อย 3 คอลัมน์)
          if (!unit || (!hasTimestamp && otherDataCount < 3)) {
            return; // ข้ามแถวนี้
          }
          
          const existing = beforeUnitMap.get(unit);
          
          if (!existing) {
            beforeUnitMap.set(unit, { row, index, timestamp });
          } else {
            try {
              const existingDate = parseDate(existing.timestamp);
              const currentDate = parseDate(timestamp);
              
              if (currentDate && (!existingDate || currentDate > existingDate)) {
                beforeUnitMap.set(unit, { row, index, timestamp });
              } else if (!currentDate && !existingDate) {
                if (index > existing.index) {
                  beforeUnitMap.set(unit, { row, index, timestamp });
                }
              }
            } catch {
              if (index > existing.index) {
                beforeUnitMap.set(unit, { row, index, timestamp });
              }
            }
          }
        });
        
        // แปลง Map กลับเป็น array (ข้อมูลที่แสดงอยู่จริง)
        const beforeFilteredData = Array.from(beforeUnitMap.values())
          .sort((a, b) => b.index - a.index)
          .map(item => item.row);
        
        console.log(`[Dashboard] beforeFilteredData: ${beforeFilteredData.length} units (from ${beforeData.length} rows after date filter)`);
        
        // รายชื่อหน่วยทั้งหมด 9 หน่วย
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
        
        // สร้าง Map สำหรับเก็บข้อมูลของแต่ละหน่วย
        const beforeUnitDataMap = new Map<string, SheetRow>();
        beforeFilteredData.forEach((row: SheetRow) => {
          const unit = row[unitHeader] || '';
          if (unit) {
            beforeUnitDataMap.set(unit, row);
          }
        });
        
        // สร้าง status squares สำหรับทั้ง 9 หน่วย
        const beforeStatusSquares: ('reject' | 'green' | 'orange' | 'red')[] = [];
        let beforeReported = 0;
        let beforeProblems = 0; // นับสีส้ม (รอตรวจสอบ)
        let beforeCompleted = 0;
        
        allUnits.forEach((unitName) => {
          const row = beforeUnitDataMap.get(unitName);
          
          if (!row) {
            // ไม่มีข้อมูล = สีแดง
            beforeStatusSquares.push('red');
          } else {
            // มีข้อมูล - ตรวจสอบสถานะ
            beforeReported++;
            const status = row[statusHeader] || '0';
            const reject = row[rejectHeader] || '0';
            
            // ถ้า reject = 1 เป็นสีเทา (reject)
            if (reject === '1' || reject === '1.0') {
              beforeStatusSquares.push('reject');
            }
            // เรียบร้อย = ตรวจสอบแล้ว (status = 1) และไม่ reject = สีเขียว
            else if (status === '1' || status === '1.0') {
              beforeCompleted++;
              beforeStatusSquares.push('green');
            } else {
              // ยังไม่กดตรวจสอบ (status = 0 และไม่ reject) = สีส้ม - นับเป็น "รอตรวจสอบ"
              beforeProblems++;
              beforeStatusSquares.push('orange');
            }
          }
        });
        
        const beforeTotal = allUnits.length;

        // Process after count data (sheets2)
        // afterHeaders, afterStatusHeader, afterRejectHeader, afterUnitHeader, and afterTimestampHeader already declared above
        
        // กรองข้อมูลให้เหลือแค่ข้อมูลล่าสุดของแต่ละหน่วย (เหมือน SheetData2.tsx)
        const afterUnitMap = new Map<string, { row: SheetRow; index: number; timestamp: string }>();
        
        afterData.forEach((row: SheetRow, index: number) => {
          const unit = row[afterUnitHeader] || '';
          const timestamp = row[afterTimestampHeader] || '';
          
          // ตรวจสอบว่าแถวมีข้อมูลจริงๆ (เหมือน SheetData2.tsx)
          // ต้องมีชื่อหน่วย และต้องมี timestamp หรือมีข้อมูลอื่นๆ อย่างน้อย 3 คอลัมน์ (ไม่นับชื่อหน่วยและ timestamp)
          const hasTimestamp = timestamp && timestamp.trim() !== '';
          const otherDataCount = Object.entries(row).filter(([key, val]) => {
            // ข้ามชื่อหน่วยและ timestamp
            if (key === afterUnitHeader || key === afterTimestampHeader) return false;
            // ตรวจสอบว่ามีข้อมูลที่ไม่ใช่ค่าว่าง
            const value = val && typeof val === 'string' ? val.trim() : '';
            return value !== '';
          }).length;
          
          // ข้ามแถวที่ไม่มีข้อมูลจริงๆ (ไม่มี timestamp และไม่มีข้อมูลอื่นๆ อย่างน้อย 3 คอลัมน์)
          if (!unit || (!hasTimestamp && otherDataCount < 3)) {
            return; // ข้ามแถวนี้
          }
          
          const existing = afterUnitMap.get(unit);
          
          if (!existing) {
            afterUnitMap.set(unit, { row, index, timestamp });
          } else {
            try {
              const existingDate = parseDate(existing.timestamp);
              const currentDate = parseDate(timestamp);
              
              if (currentDate && (!existingDate || currentDate > existingDate)) {
                afterUnitMap.set(unit, { row, index, timestamp });
              } else if (!currentDate && !existingDate) {
                if (index > existing.index) {
                  afterUnitMap.set(unit, { row, index, timestamp });
                }
              }
            } catch {
              if (index > existing.index) {
                afterUnitMap.set(unit, { row, index, timestamp });
              }
            }
          }
        });
        
        // แปลง Map กลับเป็น array (ข้อมูลที่แสดงอยู่จริง)
        const afterFilteredData = Array.from(afterUnitMap.values())
          .sort((a, b) => b.index - a.index)
          .map(item => item.row);
        
        console.log(`[Dashboard] afterFilteredData: ${afterFilteredData.length} units (from ${afterData.length} rows after date filter)`);
        
        // สร้าง Map สำหรับเก็บข้อมูลของแต่ละหน่วย
        const afterUnitDataMap = new Map<string, SheetRow>();
        afterFilteredData.forEach((row: SheetRow) => {
          const unit = row[afterUnitHeader] || '';
          if (unit) {
            afterUnitDataMap.set(unit, row);
          }
        });
        
        // สร้าง status squares สำหรับทั้ง 9 หน่วย
        const afterStatusSquares: ('reject' | 'green' | 'orange' | 'red')[] = [];
        let afterReported = 0;
        let afterProblems = 0; // นับสีส้ม (รอตรวจสอบ)
        let afterCompleted = 0;
        
        allUnits.forEach((unitName) => {
          const row = afterUnitDataMap.get(unitName);
          
          if (!row) {
            // ไม่มีข้อมูล = สีแดง
            afterStatusSquares.push('red');
          } else {
            // มีข้อมูล - ตรวจสอบสถานะ
            afterReported++;
            const status = row[afterStatusHeader] || '0';
            const reject = row[afterRejectHeader] || '0';
            
            // ถ้า reject = 1 เป็นสีเทา (reject)
            if (reject === '1' || reject === '1.0') {
              afterStatusSquares.push('reject');
            }
            // เรียบร้อย = ตรวจสอบแล้ว (status = 1) และไม่ reject = สีเขียว
            else if (status === '1' || status === '1.0') {
              afterCompleted++;
              afterStatusSquares.push('green');
            } else {
              // ยังไม่กดตรวจสอบ (status = 0 และไม่ reject) = สีส้ม - นับเป็น "รอตรวจสอบ"
              afterProblems++;
              afterStatusSquares.push('orange');
            }
          }
        });
        
        const afterTotal = allUnits.length;

        // Process abnormal reports (sheets3)
        // กรองข้อมูลแถวว่างๆ ออกก่อน (เหมือน SheetData3.tsx)
        // abnormalHeaders, abnormalUnitHeader, and abnormalTimestampHeader already declared above
        
        const abnormalFilteredData = abnormalData.filter((row: SheetRow) => {
          const unit = row[abnormalUnitHeader] || '';
          const timestamp = row[abnormalTimestampHeader] || '';
          
          // ตรวจสอบว่าแถวมีข้อมูลจริงๆ
          // ต้องมีชื่อหน่วย และต้องมี timestamp หรือมีข้อมูลอื่นๆ อย่างน้อย 3 คอลัมน์ (ไม่นับชื่อหน่วยและ timestamp)
          const hasTimestamp = timestamp && timestamp.trim() !== '';
          const otherDataCount = Object.entries(row).filter(([key, val]) => {
            // ข้ามชื่อหน่วยและ timestamp
            if (key === abnormalUnitHeader || key === abnormalTimestampHeader) return false;
            // ตรวจสอบว่ามีข้อมูลที่ไม่ใช่ค่าว่าง
            const value = val && typeof val === 'string' ? val.trim() : '';
            return value !== '';
          }).length;
          
          // ข้ามแถวที่ไม่มีข้อมูลจริงๆ (ไม่มี timestamp และไม่มีข้อมูลอื่นๆ อย่างน้อย 3 คอลัมน์)
          return unit && (hasTimestamp || otherDataCount >= 3);
        });
        
        console.log(`[Dashboard] abnormalFilteredData: ${abnormalFilteredData.length} rows (from ${abnormalData.length} rows after date filter)`);
        
        const abnormalStatusHeader = abnormalHeaders.find(h => h.includes('สถานะ') || h.toLowerCase().includes('status')) || '';
        const abnormalRejectHeader = abnormalHeaders.find(h => h.includes('reject') || h.includes('ปฏิเสธ') || h.toLowerCase().includes('reject')) || '';
        const abnormalCloseCaseHeader = abnormalHeaders.find(h => h.includes('ปิดเคส') || h.includes('ปิด')) || '';
        
        const abnormalTotal = abnormalFilteredData.length;
        let abnormalChecked = 0;
        let abnormalRemaining = 0;
        
        // Calculate new reports in current hour (นับใหม่ทุกชั่วโมง)
        const now = new Date();
        const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
        let newInHour = 0;
        
        abnormalFilteredData.forEach((row: SheetRow) => {
          const status = row[abnormalStatusHeader] || '0';
          const reject = row[abnormalRejectHeader] || '0';
          const closeCase = row[abnormalCloseCaseHeader] || '0';
          
          // ถ้า reject = 1 → นับเป็น remaining
          if (reject === '1' || reject === '1.0') {
            abnormalRemaining++;
          }
          // ปิดเคส = 1 → นับเป็น checked
          else if (closeCase === '1' || closeCase === '1.0') {
            abnormalChecked++;
          }
          // ตรวจสอบแล้ว (status = 1) แต่ยังไม่ปิดเคส → นับเป็น checked
          else if (status === '1' || status === '1.0') {
            abnormalChecked++;
          } else {
            // ยังไม่กดตรวจสอบ (status = 0 และไม่ reject) → นับเป็น remaining
            abnormalRemaining++;
          }
          
          // Check timestamp for new reports in current hour
          const timestamp = row[abnormalTimestampHeader] || '';
          if (timestamp) {
            try {
              const reportDate = new Date(timestamp);
              // นับเฉพาะข้อมูลที่เข้ามาในชั่วโมงปัจจุบัน (ตั้งแต่ต้นชั่วโมงจนถึงตอนนี้)
              if (reportDate >= currentHourStart && reportDate <= now) {
                newInHour++;
              }
            } catch (e) {
              // Ignore date parse errors
            }
          }
        });

        // Calculate Top 3 units with most abnormal reports (all reports, not just problems)
        const unitAbnormalCount = new Map<string, number>();
        abnormalFilteredData.forEach((row: SheetRow) => {
          const unit = row[abnormalUnitHeader] || '';
          if (unit) {
            unitAbnormalCount.set(unit, (unitAbnormalCount.get(unit) || 0) + 1);
          }
        });
        
        const top3Problems = Array.from(unitAbnormalCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([unit]) => unit);

        // สร้าง 9 สี่เหลี่ยมสำหรับรายงานผิดปกติ โดยนับจำนวนรายงานในแต่ละหน่วย
        const abnormalStatusSquares: ('green' | 'yellow' | 'orange' | 'red')[] = [];
        allUnits.forEach((unitName) => {
          const count = unitAbnormalCount.get(unitName) || 0;
          if (count === 0) {
            abnormalStatusSquares.push('green'); // ไม่มีรายงาน = เขียว
          } else if (count <= 5) {
            abnormalStatusSquares.push('yellow'); // 1-5 รายงาน = เหลือง
          } else if (count <= 10) {
            abnormalStatusSquares.push('orange'); // 6-10 รายงาน = ส้ม
          } else {
            abnormalStatusSquares.push('red'); // >10 รายงาน = แดง
          }
        });

        // Helper function to parse date from timestamp string
        const parseDate = (timestamp: string): Date | null => {
          if (!timestamp || timestamp.trim() === '') return null;
          
          try {
            // Try parsing as MM/DD/YYYY HH:MM:SS format (from Google Sheets)
            const dateMatch = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
            if (dateMatch) {
              const [, month, day, year, hours, minutes, seconds] = dateMatch;
              return new Date(
                parseInt(year),
                parseInt(month) - 1, // Month is 0-indexed
                parseInt(day),
                parseInt(hours),
                parseInt(minutes),
                parseInt(seconds)
              );
            }
            // Try standard Date parsing
            const date = new Date(timestamp);
            return isNaN(date.getTime()) ? null : date;
          } catch {
            return null;
          }
        };

        // Calculate timeline summary for the whole day (รวมทุกหน่วยและทุกหัวข้อ)
        // Timeline: ก่อนเปิดหีบ -> เปิดหีบ (8:00) -> ระหว่างเปิดหีบ (8:00-17:00, 3 เส้น) -> ปิดหีบ (17:00) -> ระหว่างนับคะแนน (17:00-24:00, 2 เส้น) -> นับคะแนนเสร็จ
        const openBoxTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 8, 0, 0);
        const closeBoxTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 17, 0, 0);
        const votingPeriodHours = 9; // 8:00-17:00 = 9 hours (แบ่งเป็น 3 เส้น เส้นละ 3 ชั่วโมง)
        const countingPeriodHours = 7; // 17:00-24:00 = 7 hours (แบ่งเป็น 2 เส้น)

        // นับข้อมูลก่อนเปิดหีบ (ก่อน 8:00) - เฉพาะรายงานผิดปกติ (abnormalData) เท่านั้น
        let beforeOpenCount = 0;
        abnormalFilteredData.forEach((row: SheetRow) => {
          const timestamp = row[abnormalTimestampHeader] || '';
          if (timestamp) {
            const reportDate = parseDate(timestamp);
            if (reportDate && reportDate < openBoxTime) {
              beforeOpenCount++;
            }
          }
        });

        // Count reports by hour in voting period (8:00-17:00) - เฉพาะรายงานผิดปกติ (abnormalData) เท่านั้น
        const votingHourCounts = Array(votingPeriodHours).fill(0);
        
        // จาก abnormalFilteredData (รายงานผิดปกติ) - เฉพาะวันที่ที่เลือก (ข้อมูลถูกกรองแล้ว)
        // นับข้อมูลที่เวลาตั้งแต่ 8:00 ถึง 16:59 (ไม่รวม 17:00)
        // แต่ไม่นับข้อมูลที่เวลา 8:00:00-8:00:59 เพราะจะนับใน openBoxCount แทน
        abnormalFilteredData.forEach((row: SheetRow) => {
          const timestamp = row[abnormalTimestampHeader] || '';
          if (timestamp) {
            const reportDate = parseDate(timestamp);
            if (reportDate) {
              const hours = reportDate.getHours();
              const minutes = reportDate.getMinutes();
              // นับข้อมูลที่เวลาตั้งแต่ 8:01 ถึง 16:59 (ไม่รวม 8:00 และ 17:00)
              if (hours === 8 && minutes > 0) {
                // ข้อมูลที่ 8:01-8:59
                const hourIndex = hours - 8;
                if (hourIndex >= 0 && hourIndex < votingPeriodHours) {
                  votingHourCounts[hourIndex]++;
                }
              } else if (hours > 8 && hours < 17) {
                // ข้อมูลที่ 9:00-16:59
                const hourIndex = hours - 8;
                if (hourIndex >= 0 && hourIndex < votingPeriodHours) {
                  votingHourCounts[hourIndex]++;
                }
              }
            }
          }
        });

        // Count reports by hour in counting period (17:00-24:00) - เฉพาะรายงานผิดปกติ (abnormalData) เท่านั้น
        const countingHourCounts = Array(countingPeriodHours).fill(0);
        
        // จาก abnormalFilteredData (รายงานผิดปกติ) ในช่วงเวลานับคะแนน - เฉพาะวันที่ที่เลือก (ข้อมูลถูกกรองแล้ว)
        // นับข้อมูลที่เวลาตั้งแต่ 17:01 เป็นต้นไป (ไม่นับ 17:00 เพราะจะนับใน closeBoxCount แทน)
        abnormalFilteredData.forEach((row: SheetRow) => {
          const timestamp = row[abnormalTimestampHeader] || '';
          if (timestamp) {
            const reportDate = parseDate(timestamp);
            if (reportDate) {
              const hours = reportDate.getHours();
              const minutes = reportDate.getMinutes();
              // นับข้อมูลที่เวลาตั้งแต่ 17:01 เป็นต้นไป (17:01-23:59)
              if (hours === 17 && minutes > 0) {
                // ข้อมูลที่ 17:01-17:59
                const hourIndex = hours - 17;
                if (hourIndex >= 0 && hourIndex < countingPeriodHours) {
                  countingHourCounts[hourIndex]++;
                  console.log(`[Debug] abnormalData counting: ${hours}:${minutes.toString().padStart(2, '0')} (hourIndex: ${hourIndex}) - ${timestamp}`);
                }
              } else if (hours > 17 && hours < 24) {
                // ข้อมูลที่ 18:00-23:59
                const hourIndex = hours - 17;
                if (hourIndex >= 0 && hourIndex < countingPeriodHours) {
                  countingHourCounts[hourIndex]++;
                  console.log(`[Debug] abnormalData counting: ${hours}:${minutes.toString().padStart(2, '0')} (hourIndex: ${hourIndex}) - ${timestamp}`);
                }
              }
            } else {
              console.log(`[Debug] abnormalData parseDate failed: ${timestamp}`);
            }
          }
        });

        // นับข้อมูลที่เปิดหีบ (8:00:00-8:00:59) - เฉพาะรายงานผิดปกติ (abnormalData) เท่านั้น
        let openBoxCount = 0;
        abnormalFilteredData.forEach((row: SheetRow) => {
          const timestamp = row[abnormalTimestampHeader] || '';
          if (timestamp) {
            const reportDate = parseDate(timestamp);
            if (reportDate) {
              const hours = reportDate.getHours();
              const minutes = reportDate.getMinutes();
              // นับเฉพาะข้อมูลที่เวลา 8:00:00-8:00:59
              if (hours === 8 && minutes === 0) {
                openBoxCount++;
              }
            }
          }
        });

        // นับข้อมูลที่ปิดหีบ (17:00:00) - เฉพาะรายงานผิดปกติ (abnormalData) เท่านั้น
        // นับเฉพาะข้อมูลที่เวลา 17:00:00 (ไม่นับ 17:01-17:59 เพราะจะนับใน countingHourCounts)
        let closeBoxCount = 0;
        abnormalFilteredData.forEach((row: SheetRow) => {
          const timestamp = row[abnormalTimestampHeader] || '';
          if (timestamp) {
            const reportDate = parseDate(timestamp);
            if (reportDate) {
              const hours = reportDate.getHours();
              const minutes = reportDate.getMinutes();
              // นับเฉพาะข้อมูลที่เวลา 17:00:00
              if (hours === 17 && minutes === 0) {
                closeBoxCount++;
              }
            }
          }
        });

        // นับข้อมูลที่นับคะแนนเสร็จ - เฉพาะรายงานผิดปกติ (abnormalData) เท่านั้น
        // ต้องมี timestamp และต้องมีเวลาตอน 17:00 หรือหลังจากนั้น
        let countCompleteCount = 0;
        abnormalFilteredData.forEach((row: SheetRow) => {
          const status = row[abnormalStatusHeader] || '0';
          const timestamp = row[abnormalTimestampHeader] || '';
          
          // ตรวจสอบว่า status = '1' และมี timestamp ที่ถูกต้อง
          if ((status === '1' || status === '1.0') && timestamp) {
            const reportDate = parseDate(timestamp);
            if (reportDate) {
              const hours = reportDate.getHours();
              // ต้องมีเวลาตอน 17:00 หรือหลังจากนั้น (17:00-23:59)
              if (hours >= 17 && hours < 24) {
                countCompleteCount++;
                console.log(`[Debug] countComplete: ${hours}:${reportDate.getMinutes().toString().padStart(2, '0')} - ${timestamp}`);
              } else {
                console.log(`[Debug] countComplete skipped (time < 17:00): ${hours}:${reportDate.getMinutes().toString().padStart(2, '0')} - ${timestamp}`);
              }
            } else {
              console.log(`[Debug] countComplete skipped (parseDate failed): ${timestamp}`);
            }
          } else if ((status === '1' || status === '1.0') && !timestamp) {
            console.log(`[Debug] countComplete skipped (no timestamp): status=${status}`);
          }
        });

        // แบ่งช่วงเวลาใช้สิทธิเลือกตั้ง (8:00-17:00) เป็น 3 เส้น (เส้นละ 3 ชั่วโมง)
        const votingSegmentData = [
          { count: votingHourCounts.slice(0, 3).reduce((sum, count) => sum + count, 0), timeRange: '8:00-11:00' },
          { count: votingHourCounts.slice(3, 6).reduce((sum, count) => sum + count, 0), timeRange: '11:00-14:00' },
          { count: votingHourCounts.slice(6, 9).reduce((sum, count) => sum + count, 0), timeRange: '14:00-17:00' },
        ];
        const votingTotal = votingHourCounts.reduce((sum, count) => sum + count, 0);
        
        console.log(`[Timeline] Date: ${selectedYear}-${selectedMonth + 1}-${selectedDay}`);
        console.log(`[Timeline] beforeOpenCount: ${beforeOpenCount}, openBoxCount: ${openBoxCount}, closeBoxCount: ${closeBoxCount}`);
        console.log(`[Timeline] votingHourCounts:`, votingHourCounts);
        console.log(`[Timeline] countingHourCounts:`, countingHourCounts);
        console.log(`[Timeline] votingTotal: ${votingTotal}, countingTotal: ${countingHourCounts.reduce((sum, count) => sum + count, 0)}`);
        console.log(`[Timeline] countCompleteCount: ${countCompleteCount}`);
        console.log(`[Timeline] beforeFilteredData count: ${beforeFilteredData.length}, afterFilteredData count: ${afterFilteredData.length}, abnormalFilteredData count: ${abnormalFilteredData.length}`);
        
        // Debug: ตรวจสอบข้อมูลที่ถูกนับในแต่ละช่วงเวลา (แสดงรายละเอียด) - เฉพาะรายงานผิดปกติ (abnormalData) เท่านั้น
        console.log(`[Timeline Debug] Total data sources (abnormal only): ${abnormalFilteredData.length}`);
        console.log(`[Timeline Debug] Voting period breakdown (abnormal only):`, {
          abnormalData: abnormalFilteredData.filter(r => {
            const ts = r[abnormalTimestampHeader] || '';
            if (!ts) return false;
            const d = parseDate(ts);
            return d && d.getHours() >= 8 && d.getHours() < 17;
          }).length,
        });
        console.log(`[Timeline Debug] Counting period breakdown (abnormal only):`, {
          abnormalData: abnormalFilteredData.filter(r => {
            const ts = r[abnormalTimestampHeader] || '';
            if (!ts) return false;
            const d = parseDate(ts);
            return d && d.getHours() >= 17 && d.getHours() < 24;
          }).length,
        });
        
        // Debug: ตรวจสอบข้อมูลที่ถูกนับในแต่ละช่วงเวลา - เฉพาะรายงานผิดปกติ (abnormalData) เท่านั้น
        let debugVotingCount = 0;
        abnormalFilteredData.forEach((row: SheetRow) => {
          const timestamp = row[abnormalTimestampHeader] || '';
          if (timestamp) {
            const reportDate = parseDate(timestamp);
            if (reportDate) {
              const hours = reportDate.getHours();
              if (hours >= 8 && hours < 17) {
                debugVotingCount++;
                console.log(`[Debug] abnormalData voting: ${hours}:00 - ${timestamp}`);
              } else if (hours >= 17 && hours < 24) {
                console.log(`[Debug] abnormalData counting: ${hours}:00 - ${timestamp}`);
              }
            }
          }
        });
        console.log(`[Debug] Total voting period data (abnormal only): ${debugVotingCount}`);
        
        const maxVotingSegment = Math.max(...votingSegmentData.map(s => s.count), 1);
        const votingSegments = votingSegmentData.map(segment => ({
          value: Math.min(Math.ceil((segment.count / maxVotingSegment) * 5), 5),
          count: segment.count,
          timeRange: segment.timeRange,
        }));

        // แบ่งช่วงเวลานับคะแนน (17:00-24:00) เป็น 2 เส้น
        const countingSegmentData = [
          { count: countingHourCounts.slice(0, 3).reduce((sum, count) => sum + count, 0), timeRange: '17:00-20:00', label: 'ระหว่างนับคะแนน' },
          { count: countingHourCounts.slice(3, 7).reduce((sum, count) => sum + count, 0), timeRange: '20:00-00:00', label: 'หลังนับคะแนน' },
        ];
        const countingTotal = countingHourCounts.reduce((sum, count) => sum + count, 0);
        const maxCountingSegment = Math.max(...countingSegmentData.map(s => s.count), 1);
        const countingSegments = countingSegmentData.map(segment => ({
          value: Math.min(Math.ceil((segment.count / maxCountingSegment) * 5), 5),
          count: segment.count,
          timeRange: segment.timeRange,
          label: segment.label,
        }));

        // สร้าง timeline เดียวสำหรับทั้งวัน
        const unitTimelines = [{
          unit: 'รวมทั้งวัน',
          timeline: {
            beforeOpen: beforeOpenCount,
            openBox: openBoxCount,
            votingPeriod: votingSegments, // Array of 3 {value, count}
            votingTotal: votingTotal,
            closeBox: closeBoxCount,
            countingPeriod: countingSegments, // Array of 2 {value, count}
            countingTotal: countingTotal,
            countComplete: countCompleteCount,
          },
        }];

        setStats({
          beforeBox: {
            reported: beforeReported,
            total: 9,
            problems: beforeProblems,
            completed: beforeCompleted,
            statusSquares: beforeStatusSquares, // 9 squares
          },
          afterCount: {
            reported: afterReported,
            total: 9,
            problems: afterProblems,
            completed: afterCompleted,
            statusSquares: afterStatusSquares, // 9 squares
          },
          abnormal: {
            total: abnormalTotal,
            checked: abnormalChecked,
            remaining: abnormalRemaining,
            newInHour,
            statusSquares: abnormalStatusSquares, // 9 squares
          },
          top3Problems,
          unitTimelines,
        });
        
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-red-600">เกิดข้อผิดพลาด: {error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">ไม่มีข้อมูล</div>
      </div>
    );
  }

  const StatusSquare = ({ color }: { color: 'reject' | 'green' | 'yellow' | 'orange' | 'red' }) => {
    const colorClasses = {
      reject: 'bg-gray-400',
      green: 'bg-green-500',
      yellow: 'bg-yellow-300',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
    };
    
    return (
      <div className={`w-9 h-9 ${colorClasses[color]} rounded-sm`} />
    );
  };

  const StatCard = ({ label, value }: { label: string; value: string | number }) => (
    <div className="bg-white border-2 border-orange-500 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
    <div className="text-xs sm:text-sm text-orange-700 mb-1 font-medium">{label}</div>
    <div className="text-lg sm:text-xl font-bold text-orange-900">{value}</div>
  </div>
  );
  const StatCard2 = ({ label, value }: { label: string; value: string | number }) => (
    <div className="bg-white border-2 border-orange-500 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-xs sm:text-sm text-orange-700 mb-1 font-medium">{label}</div>
      <div className="text-lg sm:text-xl font-bold text-orange-900">{value}</div>
    </div>
  );
 

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Date */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <label className="text-sm sm:text-base font-semibold text-orange-800">Dash Board Date:</label>
          <input
            type="date"
            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
            onChange={(e) => {
              const dateString = e.target.value;
              if (dateString) {
                // Parse date string as local date (YYYY-MM-DD)
                const [year, month, day] = dateString.split('-').map(Number);
                const newDate = new Date(year, month - 1, day);
                if (!isNaN(newDate.getTime())) {
                  setSelectedDate(newDate);
                  console.log(`[DatePicker] Selected date: ${year}-${month}-${day}, Date object: ${newDate.toString()}`);
                }
              }
            }}
            className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg px-5 py-2.5 text-lg font-bold text-white shadow-md border-none outline-none cursor-pointer hover:from-orange-500 hover:to-orange-600 transition-colors"
            style={{
              colorScheme: 'dark',
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel */}
          <div className="space-y-6">
            {/* รายงานก่อนเปิดหีบ */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-orange-300 hover:shadow-xl transition-shadow">
              <h2 className="text-base sm:text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                รายงานก่อนเปิดหีบ
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-4 ">
                <StatCard label="รายงานแล้ว" value={`${stats.beforeBox.reported}/${stats.beforeBox.total}`} />
                <StatCard label="รอตรวจสอบ" value={stats.beforeBox.problems} />
                <StatCard label="เรียบร้อย" value={stats.beforeBox.completed} />
              </div>
              <div className="flex gap-2 flex-wrap mt-3">
                {stats.beforeBox.statusSquares.map((color, index) => (
                  <StatusSquare key={index} color={color} />
                ))}
              </div>
            </div>

            {/* รายงานเมื่อนับคะแนนเสร็จ */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-orange-300 hover:shadow-xl transition-shadow">
              <h2 className="text-base sm:text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                รายงานเมื่อนับคะแนนเสร็จ
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatCard label="รายงานแล้ว" value={`${stats.afterCount.reported}/${stats.afterCount.total}`} />
                <StatCard label="รอตรวจสอบ" value={stats.afterCount.problems} />
                <StatCard label="เรียบร้อย" value={stats.afterCount.completed} />
              </div>
              <div className="flex gap-2 flex-wrap mt-3">
                {stats.afterCount.statusSquares.map((color, index) => (
                  <StatusSquare key={index} color={color} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* รายงานผิดปกติ */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-orange-300 hover:shadow-xl transition-shadow">
              <h2 className="text-base sm:text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                รายงานผิดปกติ
              </h2>
              <div className="flex gap-3 mb-4">
                <StatCard2 label="รายงานทั้งหมด" value={stats.abnormal.total} />
                <StatCard2 label="ตรวจสอบแล้ว" value={stats.abnormal.checked} />
                <StatCard2 label="คงเหลือปัญหา" value={stats.abnormal.remaining} />
                <StatCard2 label="รายงานใหม่ใน 1 ชั่วโมง" value={stats.abnormal.newInHour} />
              </div>
              <div className="flex gap-2 flex-wrap mt-3">
                {stats.abnormal.statusSquares.map((color, index) => (
                  <StatusSquare key={index} color={color} />
                ))}
              </div>
            </div>

            {/* Top 3 หน่วยมีปัญหา */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-orange-300 hover:shadow-xl transition-shadow">
              <h2 className="text-base sm:text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                Top 3 หน่วยมีปัญหา
              </h2>
              <div className="space-y-1.5">
                {stats.top3Problems.map((unit, index) => (
                  <div key={index} className="p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm sm:text-sm font-semibold text-orange-800">
                      {unit || `หน่วย ${index + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Progress Section - Below the grid */}
        <div className="mt-6 bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-orange-300 hover:shadow-xl transition-shadow">
          <h2 className="text-base sm:text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
            ความคืบหน้างานของหน่วย
          </h2>
          <div>
            {stats.unitTimelines.map((item, index) => {
              // คำนวณค่าสูงสุดสำหรับ normalization
              const allCounts = [
                item.timeline.beforeOpen,
                item.timeline.openBox,
                ...item.timeline.votingPeriod.map(s => s.count),
                item.timeline.closeBox,
                ...item.timeline.countingPeriod.map(s => s.count),
                item.timeline.countComplete,
              ];
              const maxCount = Math.max(...allCounts, 1);
              
              // ฟังก์ชันคำนวณความกว้างของแท่งกราฟ (สูงสุด 100%)
              const getBarWidth = (count: number) => {
                return Math.max((count / maxCount) * 100, count > 0 ? 2 : 0);
              };
              
              return (
                <div key={index} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  {/* Header: รวมทั้งวัน */}
                  <div className="text-sm font-semibold text-orange-600 mb-4">รวมทั้งวัน</div>
                  
                  {/* Timeline Vertical - ใช้โครงสร้างที่ผู้ใช้ให้มา */}
                  <div className="space-y-3">
                    <div className="text-xs text-gray-600 font-semibold mb-4 tracking-wide uppercase">Timeline</div>
                    
                    {/* ก่อนเปิดหีบ - เส้นสีน้ำเงิน + กราฟแท่ง */}
                    <div className='flex w-full ml-2.5 items-center gap-3'>
                      <div className='w-1.5 h-10 bg-gradient-to-b from-blue-400 to-blue-500 rounded-full mb-2 shadow-lg'></div>
                      <div className='flex-1 mb-2 ml-3 flex items-center gap-3'>
                        <div className='w-28 text-[11px] text-gray-700 font-semibold leading-tight'>
                          <div className="text-gray-800">ก่อนเปิดหีบ</div>
                        </div>
                        <div className='flex-1 flex items-center relative'>
                          <div 
                            className='bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 rounded-full border-2 border-blue-600 h-5 flex items-center justify-end text-white text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] pr-3 backdrop-blur-sm'
                            style={{ width: `${getBarWidth(item.timeline.beforeOpen)}%`, minWidth: item.timeline.beforeOpen > 0 ? '50px' : '0' }}
                          >
                            {item.timeline.beforeOpen > 0 && (
                              <span className="drop-shadow-md">{item.timeline.beforeOpen}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* เปิดหีบ - วงกลม + กราฟแท่ง */}
                    <div className='flex items-center gap-3'>
                      <div className='w-7 h-7 bg-gradient-to-br from-white to-blue-50 border-3 border-blue-500 rounded-full z-10 shadow-lg ring-2 ring-blue-200'></div>
                      <div className='flex-1 mt-0.5 ml-3 flex items-center'>
                        <div className='w-28 text-[11px] text-gray-700 font-semibold leading-tight'>
                          <div className="text-gray-800">เปิดหีบ</div>
                        </div>
                        <div className='flex-1 flex items-center relative'>
                          <div 
                            className='bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-full border-2 border-blue-700 h-5 flex items-center justify-end text-white text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] pr-3 backdrop-blur-sm'
                            style={{ width: `${getBarWidth(item.timeline.openBox)}%`, minWidth: item.timeline.openBox > 0 ? '50px' : '0' }}
                          >
                            {item.timeline.openBox > 0 && (
                              <span className="drop-shadow-md">{item.timeline.openBox}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* ระหว่างเปิดหีบ - เส้นสีส้ม 3 เส้น (dashed) + กราฟแท่ง */}
                    <div className="space-y-1">
                      {item.timeline.votingPeriod.map((segment, i) => (
                        <div key={i} className='flex ml-2.5 mt-2 items-center gap-3'>
                          <div className='w-1.5 h-10 border-l-2 border-dashed border-orange-400 mb-2 shadow-sm'></div>
                          <div className='flex-1 mb-1 ml-3 flex items-center gap-3'>
                            <div className='w-28 text-[11px] text-orange-700 font-semibold leading-tight'>
                              <div className="text-orange-800">ระหว่างเปิดหีบ</div>
                            </div>
                            <div className='flex-1 flex items-center relative'>
                              <div 
                                className='bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 rounded-full border-2 border-orange-600 h-5 flex items-center justify-end text-white text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] pr-3 backdrop-blur-sm'
                                style={{ width: `${getBarWidth(segment.count)}%`, minWidth: segment.count > 0 ? '50px' : '0' }}
                              >
                                {segment.count > 0 && (
                                  <span className="drop-shadow-md">{segment.count}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* ปิดหีบ - วงกลม + กราฟแท่ง */}
                    <div className='flex items-center gap-3'>
                      <div className='w-7 h-7 bg-gradient-to-br from-white to-blue-50 border-3 border-blue-500 rounded-full z-10 shadow-lg ring-2 ring-blue-200'></div>
                      <div className='flex-1 mt-0.5 ml-3 flex items-center '>
                        <div className='w-28 text-[11px] text-blue-700 font-semibold leading-tight'>
                          <div className="text-blue-800">ปิดหีบ</div>
                          <div className='text-blue-600 text-[10px] font-medium'></div>
                        </div>
                        <div className='flex-1 flex items-center relative'>
                          <div 
                            className='bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-full border-2 border-blue-700 h-5 flex items-center justify-end text-white text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] pr-3 backdrop-blur-sm'
                            style={{ width: `${getBarWidth(item.timeline.closeBox)}%`, minWidth: item.timeline.closeBox > 0 ? '50px' : '0' }}
                          >
                            {item.timeline.closeBox > 0 && (
                              <span className="drop-shadow-md">{item.timeline.closeBox}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* ระหว่างนับคะแนน / หลังนับคะแนน - เส้นสีส้ม 2 เส้น (dashed) + กราฟแท่ง */}
                    {item.timeline.countingPeriod.map((segment, i) => {
                      // แสดง segment แรก (ระหว่างนับคะแนน)
                      if (i === 0) {
                        return (
                          <div key={i} className="space-y-1">
                            <div className='flex ml-2.5 mt-2 items-center gap-3'>
                              <div className='w-1.5 h-10 border-l-2 border-dashed border-orange-400 mb-2 shadow-sm'></div>
                              <div className='flex-1 mb-1 ml-3 flex items-center gap-3'>
                                <div className='w-28 text-[11px] text-red-700 font-semibold leading-tight'>
                                  <div className="text-red-800">{segment.label}</div>
                                  <div className='text-red-600 text-[10px] font-medium'></div>
                                </div>
                                <div className='flex-1 flex items-center relative'>
                                  <div 
                                    className='bg-gradient-to-r from-red-500 via-red-400 to-red-300 rounded-full border-2 border-red-600 h-5 flex items-center justify-end text-white text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] pr-3 backdrop-blur-sm'
                                    style={{ width: `${getBarWidth(segment.count)}%`, minWidth: segment.count > 0 ? '50px' : '0' }}
                                  >
                                    {segment.count > 0 && (
                                      <span className="drop-shadow-md">{segment.count}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* นับคะแนนเสร็จ - จุดสีดำ */}
                            <div className='flex items-center gap-3'>
                              <div className='w-7 h-7 bg-gradient-to-br from-gray-800 to-gray-900 border-3 border-gray-900 rounded-full z-10 shadow-xl ring-2 ring-gray-700'></div>
                              <div className='flex-1 mt-0.5 ml-3 flex items-center '>
                                <div className='w-28 text-[11px] text-green-700 font-semibold leading-tight'>
                                  <div className="text-green-800">นับคะแนนเสร็จ</div>
                                </div>
                                <div className='flex-1 flex items-center relative'>
                                  <div 
                                    className='bg-gradient-to-r from-green-600 via-green-500 to-green-400 rounded-full border-2 border-green-700 h-5 flex items-center justify-end text-white text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] pr-3 backdrop-blur-sm'
                                    style={{ width: `${getBarWidth(item.timeline.countComplete)}%`, minWidth: item.timeline.countComplete > 0 ? '50px' : '0' }}
                                  >
                                    {item.timeline.countComplete > 0 && (
                                      <span className="drop-shadow-md">{item.timeline.countComplete}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // แสดง segment ที่สอง (หลังนับคะแนน)
                      return (
                        <div key={i} className='flex ml-2.5 mt-2 items-center gap-3'>
                          <div className='w-1.5 h-10 border-l-2 border-dashed border-orange-400 mb-2 shadow-sm'></div>
                          <div className='flex-1 mb-1 ml-3 flex items-center gap-3'>
                            <div className='w-28 text-[11px] text-red-700 font-semibold leading-tight'>
                              <div className="text-red-800">{segment.label}</div>
                              <div className='text-red-600 text-[10px] font-medium'></div>
                            </div>
                            <div className='flex-1 flex items-center relative'>
                              <div 
                                className='bg-gradient-to-r from-red-500 via-red-400 to-red-300 rounded-full border-2 border-red-600 h-5 flex items-center justify-end text-white text-xs font-bold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] pr-3 backdrop-blur-sm'
                                style={{ width: `${getBarWidth(segment.count)}%`, minWidth: segment.count > 0 ? '50px' : '0' }}
                              >
                                {segment.count > 0 && (
                                  <span className="drop-shadow-md">{segment.count}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
