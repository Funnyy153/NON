'use client';

import { useEffect, useState } from 'react';
import FilterBar from './FilterBar';
import { fetchSheetData, updateSheetData } from '../lib/sheetsApi';

interface SheetRow {
  [key: string]: string;
}

// ฟังก์ชันแปลง Google Drive link เป็น image URL
function convertDriveLinkToImageUrl(driveUrl: string): string | null {
  try {
    if (!driveUrl || typeof driveUrl !== 'string') {
      return null;
    }
    
    const cleanUrl = driveUrl.trim();
    let fileId: string | null = null;
    
    // รูปแบบ 1: ?id=FILE_ID หรือ &id=FILE_ID
    const match1 = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) {
      fileId = match1[1];
    }
    
    // รูปแบบ 2: /file/d/FILE_ID/ หรือ /document/d/FILE_ID/
    if (!fileId) {
      const match2 = cleanUrl.match(/\/[a-z]+\/d\/([a-zA-Z0-9_-]+)/);
      if (match2 && match2[1]) {
        fileId = match2[1];
      }
    }
    
    // รูปแบบ 3: /thumbnail?id=FILE_ID (ถ้ามีอยู่แล้ว)
    if (!fileId) {
      const match3 = cleanUrl.match(/\/thumbnail\?id=([a-zA-Z0-9_-]+)/);
      if (match3 && match3[1]) {
        fileId = match3[1];
      }
    }
    
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
    
    console.warn('Could not extract file ID from Google Drive URL:', cleanUrl);
    return null;
  } catch (error) {
    console.error('Error converting Drive link to image URL:', error, driveUrl);
    return null;
  }
}

// ฟังก์ชันแปลง Google Drive link เป็น download URL สำหรับ export
function convertDriveLinkToDownloadUrl(driveUrl: string): string | null {
  try {
    // ดึง file ID จาก Google Drive URL
    const match = driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      // ใช้ uc?export=download สำหรับการดาวน์โหลด
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return null;
  } catch {
    return null;
  }
}

// ฟังก์ชันแยกหลาย Google Drive links จาก text
function extractDriveLinks(text: string): string[] {
  return text && typeof text === 'string' 
    ? text.match(/https?:\/\/(?:drive|docs)\.google\.com\/[^\s<>"']+/g) || []
    : [];
}

// Modal component สำหรับแสดงรูปขยาย
function ImageModal({ 
  imageUrl, 
  isOpen, 
  onClose 
}: { 
  imageUrl: string | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // ป้องกัน scroll เมื่อ modal เปิด
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
      onClick={onClose}
    >
      <div className="relative max-w-full sm:max-w-7xl max-h-full">
       
        <img
          src={imageUrl}
          alt="Expanded view"
          className="max-w-full max-h-[85vh] sm:max-h-[90vh] object-contain rounded-lg shadow-2xl bg-white p-1 sm:p-2"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}


export default function SheetData() {
  const [data, setData] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [checkedRows, setCheckedRows] = useState<Set<number>>(new Set());
  const [rejectedRows, setRejectedRows] = useState<Set<number>>(new Set());
  const [filteredToOriginalMap, setFilteredToOriginalMap] = useState<Map<number, number>>(new Map());
  const [loadingCheckboxes, setLoadingCheckboxes] = useState<Set<number>>(new Set());
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState({
    checked: true,
    unchecked: true,
  });

  // ฟังก์ชันสำหรับ fetch และ process ข้อมูล
  const fetchAndProcessData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const result = await fetchSheetData('sheets');
      const rawData = result.data;
      
      if (rawData && rawData.length > 0) {
        const headers = Object.keys(rawData[0]);
        const unitHeader = headers.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
        const timestampHeader = headers.find(h => h.toLowerCase().includes('timestamp')) || '';
        const statusColumn = headers.find(h => 
          h && (h.includes('สถานะ') || h.toLowerCase().includes('status'))
        );
        
        // กรองข้อมูลให้เหลือแค่ข้อมูลล่าสุดของแต่ละหน่วย
        const unitMap = new Map<string, { row: SheetRow; index: number; timestamp: string }>();
        
        rawData.forEach((row: SheetRow, index: number) => {
          const unit = row[unitHeader] || '';
          const timestamp = row[timestampHeader] || '';
          
          // ตรวจสอบว่าแถวมีข้อมูลจริงๆ
          // ต้องมีชื่อหน่วย และต้องมี timestamp หรือมีข้อมูลอื่นๆ อย่างน้อย 3 คอลัมน์ (ไม่นับชื่อหน่วยและ timestamp)
          const hasTimestamp = timestamp && timestamp.trim() !== '';
          const otherDataCount = Object.entries(row).filter(([key, val]) => {
            // ข้ามชื่อหน่วยและ timestamp
            if (key === unitHeader || key === timestampHeader) return false;
            // ตรวจสอบว่ามีข้อมูลที่ไม่ใช่ค่าว่าง
            const value = val && typeof val === 'string' ? val.trim() : '';
            return value !== '';
          }).length;
          
          // ข้ามแถวที่ไม่มีข้อมูลจริงๆ (ไม่มี timestamp และไม่มีข้อมูลอื่นๆ อย่างน้อย 3 คอลัมน์)
          if (!unit || (!hasTimestamp && otherDataCount < 3)) {
            return; // ข้ามแถวนี้
          }
          
          const existing = unitMap.get(unit);
            
            if (!existing) {
              // ถ้ายังไม่มีข้อมูลของหน่วยนี้ ให้เพิ่มเข้าไป
              unitMap.set(unit, { row, index, timestamp });
            } else {
              // ถ้ามีแล้ว ให้เปรียบเทียบ timestamp และเลือกที่ใหม่กว่า
              // แปลง timestamp เป็น Date object สำหรับเปรียบเทียบ
              try {
                const existingDate = new Date(existing.timestamp);
                const currentDate = new Date(timestamp);
                
                // ถ้า timestamp ปัจจุบันใหม่กว่า ให้แทนที่
                if (!isNaN(currentDate.getTime()) && (isNaN(existingDate.getTime()) || currentDate > existingDate)) {
                  unitMap.set(unit, { row, index, timestamp });
                } else if (isNaN(currentDate.getTime()) && isNaN(existingDate.getTime())) {
                  // ถ้าทั้งคู่ parse ไม่ได้ ให้ใช้ index ที่มากกว่า (ข้อมูลใหม่กว่า)
                  if (index > existing.index) {
                    unitMap.set(unit, { row, index, timestamp });
                  }
                }
              } catch {
                // ถ้า parse ไม่ได้ ให้ใช้ index ที่มากกว่า (ข้อมูลใหม่กว่า)
                if (index > existing.index) {
                  unitMap.set(unit, { row, index, timestamp });
                }
              }
            }
        });
        
        // แปลง Map กลับเป็น array และเรียงลำดับตาม index เดิม
        const filteredData = Array.from(unitMap.values())
          .sort((a, b) => b.index - a.index) // เรียงจากใหม่ไปเก่า
          .map(item => item.row);
        
        // สร้าง mapping จาก filtered index ไป original index
        const filteredToOriginalMap = new Map<number, number>();
        Array.from(unitMap.values())
          .sort((a, b) => b.index - a.index)
          .forEach((item, filteredIdx) => {
            filteredToOriginalMap.set(filteredIdx, item.index);
          });
        
        // เปรียบเทียบกับข้อมูลเดิมเพื่อดูว่ามีข้อมูลใหม่หรือไม่
        const currentDataLength = data.length;
        const hasNewData = filteredData.length > currentDataLength;
        
        setData(filteredData);
        setFilteredToOriginalMap(filteredToOriginalMap);
        
        // อัปเดต checkedRows ตาม filtered data
        if (statusColumn) {
          const checkedIndices = new Set<number>();
          filteredData.forEach((row: SheetRow, filteredIndex: number) => {
            const originalIndex = filteredToOriginalMap.get(filteredIndex);
            if (originalIndex !== undefined) {
              const statusValue = row[statusColumn];
              if (statusValue === '1' || statusValue === '1.0' || statusValue === 'ตรวจสอบแล้ว') {
                checkedIndices.add(filteredIndex);
              }
            }
          });
          setCheckedRows(checkedIndices);
          
          if (isInitialLoad) {
            console.log('Loaded checked rows from Sheet:', checkedIndices.size);
            console.log('Filtered data: showing latest entry for each unit. Total units:', filteredData.length);
          } else if (hasNewData) {
            console.log('New data detected! Updated from', currentDataLength, 'to', filteredData.length, 'units');
          }
        }

        // โหลดสถานะ "reject" หรือ "ปฏิเสธ" จาก Sheet
        const rejectColumn = headers.find(h => 
          h && (h.includes('reject') || h.includes('ปฏิเสธ') || h.toLowerCase().includes('reject'))
        );
        
        if (rejectColumn) {
          const rejectedIndices = new Set<number>();
          filteredData.forEach((row: SheetRow, filteredIndex: number) => {
            const rejectValue = row[rejectColumn];
            // ถ้าค่าเป็น "1" หรือ "1.0" ให้ mark เป็น rejected
            if (rejectValue === '1' || rejectValue === '1.0') {
              rejectedIndices.add(filteredIndex);
            }
          });
          setRejectedRows(rejectedIndices);
          
          if (isInitialLoad) {
            console.log('Loaded rejected rows from Sheet:', rejectedIndices.size);
          }
        }
      } else {
        setData([]);
      }
      
      if (isInitialLoad) {
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      if (isInitialLoad) {
        setError(errorMessage);
      } else {
        // ถ้าไม่ใช่ initial load ให้ log error แต่ไม่แสดง error state
        console.error('Error fetching data (auto-refresh):', errorMessage);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAndProcessData(true);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAndProcessData(false);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [data]); // Include data in dependencies to use latest state

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

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">ไม่มีข้อมูล</div>
      </div>
    );
  }

  const headers = Object.keys(data[0]);
  
  // สลับคอลัมน์ Timestamp กับ หน่วยเลือกตั้ง และกรองคอลัมน์ความเห็นออก
  const reorderedHeaders = [...headers]
    .filter(h => !h.includes('ความเห็น')) // ลบคอลัมน์ความเห็นเพิ่มเติม
    .filter(h => !h.includes('ความคิดเห็น')); // ลบคอลัมน์ความคิดเห็น (ถ้ามี)
  
  const timestampIndex = reorderedHeaders.findIndex(h => h.toLowerCase().includes('timestamp'));
  const unitIndex = reorderedHeaders.findIndex(h => h.includes('หน่วยเลือกตั้ง'));
  
  if (timestampIndex !== -1 && unitIndex !== -1 && timestampIndex !== unitIndex) {
    // สลับตำแหน่ง
    [reorderedHeaders[timestampIndex], reorderedHeaders[unitIndex]] = 
      [reorderedHeaders[unitIndex], reorderedHeaders[timestampIndex]];
  }

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const handleCheckboxChange = async (rowIndex: number) => {
    const newCheckedState = !checkedRows.has(rowIndex);
    
    // เริ่ม loading
    setLoadingCheckboxes(prev => new Set(prev).add(rowIndex));
    
    // อัปเดต state ทันที
    setCheckedRows(prev => {
      const newSet = new Set(prev);
      if (newCheckedState) {
        newSet.add(rowIndex);
      } else {
        newSet.delete(rowIndex);
      }
      return newSet;
    });
    
    // อัปเดตค่าใน Google Sheet
    try {
      // หา column name "สถานะ" จาก headers
      const statusColumn = headers.find(h => 
        h && (h.includes('สถานะ') || h.toLowerCase().includes('status'))
      ) || 'สถานะ';
      
      // บันทึกค่าไปยัง Google Sheet: ติ๊ก = '1', ไม่ติ๊ก = '0'
      console.log('Sending update request:', {
        rowIndex,
        value: newCheckedState ? '1' : '0', // ติ๊ก = '1', ไม่ติ๊ก = '0'
        columnName: statusColumn
      });
      
      // แปลง filtered index เป็น original index
      const originalIndex = filteredToOriginalMap.get(rowIndex);
      if (originalIndex === undefined) {
        throw new Error('ไม่พบ index ที่ต้องการอัปเดต');
      }
      
      await updateSheetData('sheets', originalIndex, statusColumn, newCheckedState ? '1' : '0');
      console.log('Sheet updated successfully');
    } catch (error) {
      console.error('Error updating sheet:', error);
      // Revert state if update failed
      setCheckedRows(prev => {
        const newSet = new Set(prev);
        if (newCheckedState) {
          newSet.delete(rowIndex);
        } else {
          newSet.add(rowIndex);
        }
        return newSet;
      });
      
      let errorMessage = 'ไม่ทราบสาเหตุ';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // ถ้าเป็น "Failed to fetch" ให้แสดงคำแนะนำเพิ่มเติม
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ไม่สามารถเชื่อมต่อ')) {
        const fullMessage = `ไม่สามารถอัปเดต Google Sheet ได้\n\n${errorMessage}\n\nกรุณาตรวจสอบ:\n1. Google Apps Script ถูก deploy แล้ว\n2. Web App ตั้งค่า "Anyone" access (ไม่ใช่ "Only myself")\n3. Apps Script มี function doPost และรองรับ action 'update'\n4. ตรวจสอบ network connection\n5. ดู console log (F12) สำหรับรายละเอียดเพิ่มเติม`;
        alert(fullMessage);
      } else {
        const fullMessage = `ไม่สามารถอัปเดต Google Sheet ได้\n\n${errorMessage}\n\nกรุณาตรวจสอบ:\n1. Google Apps Script ถูก deploy แล้ว\n2. Web App ตั้งค่า "Anyone" access\n3. Apps Script มี function doPost และรองรับ action 'update'\n4. ดู console log (F12) สำหรับรายละเอียดเพิ่มเติม`;
        alert(fullMessage);
      }
    } finally {
      // หยุด loading
      setLoadingCheckboxes(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowIndex);
        return newSet;
      });
    }
  };

  const handleRejectChange = async (rowIndex: number) => {
    try {
      // หา column name "reject" หรือ "ปฏิเสธ" จาก headers
      const rejectColumn = headers.find(h => 
        h && (h.includes('reject') || h.includes('ปฏิเสธ') || h.toLowerCase().includes('reject'))
      );
      
      if (!rejectColumn) {
        console.warn('Reject column not found in headers');
        return;
      }

      // แปลง filtered index เป็น original index
      const originalIndex = filteredToOriginalMap.get(rowIndex);
      if (originalIndex === undefined) {
        throw new Error('ไม่พบ index ที่ต้องการอัปเดต');
      }

      // อ่านค่าปัจจุบันจาก Sheet
      const currentRow = data[rowIndex];
      const currentRejectValue = currentRow[rejectColumn] || '0';
      
      // Toggle: ถ้าเป็น 1 เปลี่ยนเป็น 0, ถ้าเป็น 0 เปลี่ยนเป็น 1
      const newRejectValue = (currentRejectValue === '1' || currentRejectValue === '1.0') ? '0' : '1';
      
      // อัปเดตค่าใน Google Sheet
      await updateSheetData('sheets', originalIndex, rejectColumn, newRejectValue);
      console.log('Reject status updated successfully:', newRejectValue);

      // อัปเดตข้อมูลใน state
      setData(prevData => {
        const newData = [...prevData];
        if (newData[rowIndex]) {
          newData[rowIndex] = { ...newData[rowIndex], [rejectColumn]: newRejectValue };
        }
        return newData;
      });

      // อัปเดต rejectedRows state
      setRejectedRows(prev => {
        const newSet = new Set(prev);
        if (newRejectValue === '1') {
          newSet.add(rowIndex);
        } else {
          newSet.delete(rowIndex);
        }
        return newSet;
      });
    } catch (error) {
      console.error('Error updating reject status:', error);
      const errorMessage = error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ';
      alert(`ไม่สามารถอัปเดตสถานะ reject ได้\n\n${errorMessage}`);
    }
  };

  // ฟังก์ชันดาวน์โหลดรูปทั้ง 3 รูป
  const handleExport = async (rowIndex: number, row: SheetRow) => {
    try {
      // ตรวจสอบว่าเป็น mobile device หรือไม่
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // ใช้ headers แทน reorderedHeaders เพราะ reorderedHeaders อาจยังไม่ได้ define
      const allHeaders = Object.keys(row);
      
      // หาคอลัมน์ที่มีรูปภาพ (ป้ายไวนิล, แบบ, รายชื่อ)
      const imageHeaders = allHeaders.filter(header => 
        header.includes('ป้ายไวนิล') || 
        header.includes('แบบ') || 
        header.includes('รายชื่อ')
      );

      // ดึงข้อมูลหน่วยและ timestamp
      const unitHeader = allHeaders.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
      const timestampHeader = allHeaders.find(h => h.toLowerCase().includes('timestamp')) || '';
      
      let unit = row[unitHeader] || 'unknown';
      let timestamp = row[timestampHeader] || '';
      
      // ทำความสะอาดชื่อหน่วย
      // ลบวงเล็บและเนื้อหาในวงเล็บ เช่น (1), (2), (Pongpichan Wuthipongtechakij)
      unit = unit
        .replace(/\([^)]*\)/g, '') // ลบ (1), (2), (Pongpichan Wuthipongtechakij) เป็นต้น
        .trim();
      
      // แทน spaces และอักขระพิเศษด้วย -
      unit = unit
        .replace(/\s+/g, '-') // แทน spaces ด้วย -
        .replace(/[^a-zA-Z0-9\-ก-๙]/g, '-') // แทนอักขระพิเศษด้วย - (เก็บ a-z, A-Z, 0-9, -, และตัวอักษรไทย)
        .replace(/-+/g, '-') // แทนหลาย - ด้วย - เดียว
        .replace(/^-|-$/g, '') // ลบ - ที่ต้นและท้าย
        .trim() || 'unknown';
      
      // แปลง timestamp เป็นชื่อไฟล์
      const timestampForFilename = timestamp
        .replace(/\//g, '-') // แทน / ด้วย -
        .replace(/:/g, '-') // แทน : ด้วย -
        .replace(/\s+/g, '-') // แทน spaces ด้วย -
        .replace(/[^\w\-]/g, '') // ลบอักขระพิเศษ (เก็บ a-z, A-Z, 0-9, _, -)
        .replace(/-+/g, '-') // แทนหลาย - ด้วย - เดียว
        .replace(/^-|-$/g, '') // ลบ - ที่ต้นและท้าย
        .trim();
      
      // สร้างชื่อไฟล์: หน่วย-วันที่เวลา
      const baseFilename = timestampForFilename 
        ? `${unit}-${timestampForFilename}`
        : unit;

      // รวบรวม URLs ทั้งหมด
      const downloadUrls: string[] = [];
      for (let i = 0; i < imageHeaders.length; i++) {
        const header = imageHeaders[i];
        const value = row[header] || '';
        const driveLinks = extractDriveLinks(value);
        
        for (let j = 0; j < driveLinks.length; j++) {
          const driveLink = driveLinks[j];
          const downloadUrl = convertDriveLinkToDownloadUrl(driveLink);
          if (downloadUrl) {
            downloadUrls.push(downloadUrl);
          }
        }
      }

      if (downloadUrls.length === 0) {
        alert('ไม่พบรูปภาพในแถวนี้');
        return;
      }

      // สำหรับ mobile: เปิดแต่ละลิงก์ในแท็บใหม่
      if (isMobile) {
        alert(`กำลังเปิด ${downloadUrls.length} รูปในแท็บใหม่...\nกรุณากดดาวน์โหลดจากแต่ละแท็บ`);
        for (let i = 0; i < downloadUrls.length; i++) {
          setTimeout(() => {
            window.open(downloadUrls[i], '_blank');
          }, i * 300); // เปิดทีละแท็บทุก 300ms
        }
        return;
      }

      // สำหรับ desktop: ดาวน์โหลดแบบ programmatic
      for (let i = 0; i < downloadUrls.length; i++) {
        const downloadUrl = downloadUrls[i];
        try {
          const filename = `${baseFilename}${i > 0 ? `_${i + 1}` : ''}.jpg`;
          
          try {
            const response = await fetch(downloadUrl, {
              method: 'GET',
              mode: 'cors',
            });
            
            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              
              // รอให้ดาวน์โหลดเสร็จก่อนลบ element
              setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              }, 100);
            } else {
              // ถ้า fetch ไม่ได้ ให้เปิดในแท็บใหม่
              window.open(downloadUrl, '_blank');
            }
          } catch (fetchError) {
            // ถ้า fetch มีปัญหา CORS ให้เปิดในแท็บใหม่
            console.warn('Fetch failed, opening in new tab:', fetchError);
            window.open(downloadUrl, '_blank');
          }
          
          // รอสักครู่ก่อนดาวน์โหลดรูปถัดไป (เพิ่ม delay สำหรับ mobile)
          await new Promise(resolve => setTimeout(resolve, isMobile ? 1000 : 500));
        } catch (error) {
          console.error(`Error downloading image ${i + 1}:`, error);
        }
      }
    } catch (error) {
      console.error('Error exporting images:', error);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ: ' + (error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'));
    }
  };

  // ฟังก์ชันกำหนดความกว้างของคอลัมน์ตามชื่อ (return เป็น style object)
  const getColumnStyle = (header: string): { width?: string } => {
    // Debug: log เพื่อดูชื่อ header จริงๆ
    console.log('Checking header:', header);
    
    if (header.toLowerCase().includes('timestamp')) {
      console.log('Matched: Timestamp');
      return { width: '9%' }; // Timestamp: 1/12 = 8.33%
    }
    if (header.includes('หน่วยเลือกตั้ง')) {
      console.log('Matched: หน่วยเลือกตั้ง');
      return { width: '8.33%' }; // หน่วยเลือกตั้ง: 1/12 = 8.33%
    }
    if (header.includes('ป้ายไวนิล')) {
      console.log('Matched: ป้ายไวนิล');
      return { width: '25%' }; // คอลัมน์รูปภาพ: 3/12 = 25%
    }
    if (header.includes('แบบ')) {
      console.log('Matched: แบบ');
      return { width: '25%' }; // แบบ: 3/12 = 25%
    }
    // ตรวจสอบหลายรูปแบบของ "รายชื่อ" - เพิ่มเงื่อนไขให้ครอบคลุมมากขึ้น
    if (header.includes('รายชื่อ') || 
        header.includes('กรรมการ') || 
        header.includes('ประจำหน่วย') ||
        header.includes('มาตรา 157') ||
        header.includes('ดำเนินคดี')) {
      console.log('Matched: รายชื่อกรรมการ');
      return { width: '25%' }; // รายชื่อกรรมการ: 3/12 = 25%
    }
    
    // Default: ถ้าไม่ match กับเงื่อนไขใดๆ ให้ใช้ความกว้างอัตโนมัติ
    console.log('No match for:', header);
    return {};
  };

  // Filter data based on search term and status filters
  const rejectHeader = headers.find(h => h.includes('reject') || h.includes('ปฏิเสธ') || h.toLowerCase().includes('reject')) || '';
  
  const unitHeader = headers.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
  const timestampHeader = headers.find(h => h.toLowerCase().includes('timestamp')) || '';
  
  const filteredData = data
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => {
      // ตรวจสอบว่าแถวมีข้อมูลจริงๆ
      const unit = row[unitHeader] || '';
      const timestamp = row[timestampHeader] || '';
      const hasTimestamp = timestamp && timestamp.trim() !== '';
      const otherDataCount = Object.entries(row).filter(([key, val]) => {
        if (key === unitHeader || key === timestampHeader) return false;
        const value = val && typeof val === 'string' ? val.trim() : '';
        return value !== '';
      }).length;
      
      // ข้ามแถวที่ไม่มีข้อมูลจริงๆ
      if (!unit || (!hasTimestamp && otherDataCount < 3)) {
        return false;
      }
      
      // Filter by search term (หน่วยเลือกตั้ง)
      const matchesSearch = !searchTerm || unit.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by status
      const isChecked = checkedRows.has(index);
      const matchesStatus = (isChecked && statusFilters.checked) || (!isChecked && statusFilters.unchecked);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // ตรวจสอบว่า reject หรือไม่
      const aReject = (a.row[rejectHeader] === '1' || a.row[rejectHeader] === '1.0');
      const bReject = (b.row[rejectHeader] === '1' || b.row[rejectHeader] === '1.0');
      
      // ถ้า reject status ไม่เท่ากัน ให้ non-rejected อยู่บน
      if (aReject !== bReject) {
        return aReject ? 1 : -1; // non-rejected อยู่ก่อน (return -1)
      }
      
      // ถ้า reject status เท่ากัน ให้เรียงตาม index (ใหม่สุดอยู่บน)
      return b.index - a.index;
    })
    .map(({ row }) => row);

  // Create a mapping from filtered index to original index
  const originalIndexMap = new Map<number, number>();
  const rejectHeaderForMap = headers.find(h => h.includes('reject') || h.includes('ปฏิเสธ') || h.toLowerCase().includes('reject')) || '';
  
  const sortedData = data
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => {
      const unitHeader = headers.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
      const unit = row[unitHeader] || '';
      const matchesSearch = !searchTerm || unit.toLowerCase().includes(searchTerm.toLowerCase());
      const isChecked = checkedRows.has(index);
      const matchesStatus = (isChecked && statusFilters.checked) || (!isChecked && statusFilters.unchecked);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aReject = (a.row[rejectHeaderForMap] === '1' || a.row[rejectHeaderForMap] === '1.0');
      const bReject = (b.row[rejectHeaderForMap] === '1' || b.row[rejectHeaderForMap] === '1.0');
      if (aReject !== bReject) {
        return aReject ? 1 : -1;
      }
      return b.index - a.index;
    });
  
  sortedData.forEach(({ index }, filteredIdx) => {
    originalIndexMap.set(filteredIdx, index);
  });

  return (
    <>
      <div className="w-full overflow-x-auto p-2 sm:p-4">
        <div className=" rounded-2xl ">
          {/* Filter Bar */}
          <FilterBar
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilters}
          />
          
          {/* <h2 className="text-3xl font-bold mb-6 text-center text-orange-800 drop-shadow-sm">
            ระบบแสดงผล รายงานก่อนเปิดหีบํ
          </h2> */}
          <div className="w-full space-y-3 sm:space-y-5">
            {filteredData.map((row, filteredIdx) => {
              const index = originalIndexMap.get(filteredIdx) ?? filteredIdx;
              const isChecked = checkedRows.has(index);
              const isRejected = rejectedRows.has(index);
              const unitHeader = reorderedHeaders.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
              const timestampHeader = reorderedHeaders.find(h => h.toLowerCase().includes('timestamp')) || '';
              const unit = row[unitHeader] || '';
              const timestamp = row[timestampHeader] || '';
              
              // หาคอลัมน์รูปภาพ 3 คอลัมน์ - ใช้ลำดับ index โดยตรงจาก reorderedHeaders
              // คอลัมน์รูปภาพควรอยู่ที่ index 2, 3, 4 (หลังจาก หน่วยเลือกตั้ง และ Timestamp)
              // ใช้ลำดับตาม reorderedHeaders เพื่อให้ตรงกับลำดับที่แสดง
              
              // หา index ของคอลัมน์รูปภาพ
              const vinylIndex = reorderedHeaders.findIndex(h => h.includes('ป้ายไวนิล'));
              const formIndex = reorderedHeaders.findIndex(h => h.includes('แบบ') && !h.includes('รายชื่อ'));
              const committeeIndex = reorderedHeaders.findIndex(h => (h.includes('รายชื่อ') || h.includes('กรรมการ')) && !h.includes('แบบ'));
              
              // ใช้ลำดับ index ถ้าหาไม่เจอ (index 2, 3, 4)
              const vinylHeader = vinylIndex !== -1 ? reorderedHeaders[vinylIndex] : (reorderedHeaders[2] || '');
              const formHeader = formIndex !== -1 ? reorderedHeaders[formIndex] : (reorderedHeaders[3] || '');
              const committeeHeader = committeeIndex !== -1 ? reorderedHeaders[committeeIndex] : (reorderedHeaders[4] || '');
              
              // Debug log สำหรับแถวแรก
              if (index === 0) {
                console.log('Image headers debug:', {
                  reorderedHeaders,
                  vinylIndex,
                  formIndex,
                  committeeIndex,
                  vinyl: vinylHeader,
                  form: formHeader,
                  committee: committeeHeader
                });
              }
              
              // ดึงรูปแรกจากแต่ละคอลัมน์
              const getFirstImage = (header: string) => {
                if (!header) return null;
                const value = row[header] || '';
                if (!value) return null;
                
                const driveLinks = extractDriveLinks(value);
                if (driveLinks.length > 0) {
                  const imageUrl = convertDriveLinkToImageUrl(driveLinks[0]);
                  if (!imageUrl) {
                    console.warn(`Failed to convert Drive link for header "${header}":`, driveLinks[0]);
                  }
                  return imageUrl;
                }
                return null;
              };
              
              const vinylImage = getFirstImage(vinylHeader);
              const formImage = getFirstImage(formHeader);
              const committeeImage = getFirstImage(committeeHeader);
              
              // ตรวจสอบค่า reject
              const rejectHeader = headers.find(h => h.includes('reject') || h.includes('ปฏิเสธ') || h.toLowerCase().includes('reject')) || '';
              const rejectValue = row[rejectHeader] || '0';
              
              // ถ้า reject = 1 ให้เป็นสีเทา
              const cardColor = (rejectValue === '1' || rejectValue === '1.0') 
                ? 'bg-gray-200' 
                : 'bg-orange-50';
              const cardBorder = (rejectValue === '1' || rejectValue === '1.0') 
                ? 'border-gray-400' 
                : 'border-orange-200';
              
              return (
                <div
                  key={index}
                  className={`${cardColor} rounded-xl p-3 sm:p-4 md:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 md:gap-5 shadow-lg border-2 ${cardBorder}`}
                >
                  {/* ปุ่มสีส้มด้านซ้าย */}
                  <div
                    style={{ backgroundColor: '#FF6A13' }}
                    className="rounded-lg px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4 text-white font-semibold w-full sm:w-[140px] md:w-[160px] text-center flex items-center justify-center"
                  >
                    <div className="text-sm sm:text-base wrap-break-word">{unit || 'หน่วย'}</div>
                  </div>
                  
                  {/* Update Time */}
                  <div className="text-orange-900 font-medium w-full sm:w-auto sm:min-w-[120px] md:min-w-[70px]">
                    <div className="text-xs text-orange-600 mb-1">Update Time</div>
                    <div className="text-xs sm:text-sm font-semibold break-words">{timestamp}</div>
                  </div>
                  
                  {/* รูปภาพ 3 ส่วนเท่าๆ กัน */}
                  <div className="flex-1 flex items-center gap-2 justify-center overflow-x-auto sm:overflow-x-visible">
                    {/* รูปที่ 1: ป้ายไวนิล */}
                    <div className="flex-1 flex justify-center min-w-[70px] sm:min-w-[90px] md:max-w-[110px] flex-shrink-0">
                      {vinylImage ? (
                        <div className="relative w-full">
                          {!failedImages.has(vinylImage) ? (
                            <img
                              src={vinylImage}
                              alt="ป้ายไวนิล"
                              className="w-full h-[70px] sm:h-[85px] md:h-[100px] object-cover rounded-lg cursor-pointer border-2 border-orange-300 shadow-md"
                              onClick={() => handleImageClick(vinylImage)}
                              onError={() => {
                                setFailedImages(prev => new Set(prev).add(vinylImage));
                              }}
                            />
                          ) : (
                            <div className="w-full h-[70px] sm:h-[85px] md:h-[100px] bg-gray-300 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                              <span className="text-xs text-gray-500">Error</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-[70px] sm:h-[85px] md:h-[100px] bg-gray-200 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                          <span className="text-xs text-gray-400">ไม่มีรูป</span>
                        </div>
                      )}
                    </div>
                    
                    {/* รูปที่ 2: แบบ */}
                    <div className="flex-1 flex justify-center min-w-[70px] sm:min-w-[90px] md:max-w-[110px] flex-shrink-0">
                      {formImage ? (
                        <div className="relative w-full">
                          {!failedImages.has(formImage) ? (
                            <img
                              src={formImage}
                              alt="แบบ"
                              className="w-full h-[70px] sm:h-[85px] md:h-[100px] object-cover rounded-lg cursor-pointer border-2 border-orange-300 shadow-md"
                              onClick={() => handleImageClick(formImage)}
                              onError={() => {
                                setFailedImages(prev => new Set(prev).add(formImage));
                              }}
                            />
                          ) : (
                            <div className="w-full h-[70px] sm:h-[85px] md:h-[100px] bg-gray-300 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                              <span className="text-xs text-gray-500">Error</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-[70px] sm:h-[85px] md:h-[100px] bg-gray-200 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                          <span className="text-xs text-gray-400">ไม่มีรูป</span>
                        </div>
                      )}
                    </div>
                    
                    {/* รูปที่ 3: รายชื่อ */}
                    <div className="flex-1 flex justify-center min-w-[70px] sm:min-w-[90px] md:max-w-[110px] flex-shrink-0">
                      {committeeImage ? (
                        <div className="relative w-full">
                          {!failedImages.has(committeeImage) ? (
                            <img
                              src={committeeImage}
                              alt="รายชื่อ"
                              className="w-full h-[70px] sm:h-[85px] md:h-[100px] object-cover rounded-lg cursor-pointer border-2 border-orange-300 shadow-md"
                              onClick={() => handleImageClick(committeeImage)}
                              onError={() => {
                                setFailedImages(prev => new Set(prev).add(committeeImage));
                              }}
                            />
                          ) : (
                            <div className="w-full h-[70px] sm:h-[85px] md:h-[100px] bg-gray-300 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                              <span className="text-xs text-gray-500">Error</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-[70px] sm:h-[85px] md:h-[100px] bg-gray-200 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                          <span className="text-xs text-gray-400">ไม่มีรูป</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* สถานะตรวจสอบแล้ว */}
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[140px] justify-center sm:justify-start">
                    {loadingCheckboxes.has(index) ? (
                      <>
                        <span className="text-orange-600 text-xs sm:text-sm">กำลังอัปเดต...</span>
                        <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      </>
                    ) : isChecked ? (
                      <>
                        <span className="text-orange-900 text-xs sm:text-sm font-semibold">ตรวจสอบแล้ว</span>
                        <div 
                          className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-lg flex items-center justify-center shadow-md cursor-pointer hover:bg-green-600 transition-colors"
                          onClick={() => handleCheckboxChange(index)}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-orange-600 text-xs sm:text-sm">ยังไม่ได้ตรวจสอบ</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(index)}
                          className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer rounded-md border-2 border-orange-400 text-orange-600"
                        />
                      </>
                    )}
                  </div>
                  
                  {/* ปุ่ม Reject และ Export */}
                  <div className="flex flex-row  gap-2 w-full sm:w-auto">
                  {/* ปุ่ม Reject */}
                  <button
                    onClick={() => handleRejectChange(index)}
                    className={`rounded-lg px-3 py-2 sm:px-4 sm:py-2 flex flex-col items-center gap-1 transition-colors flex-1 sm:flex-none sm:min-w-[80px] ${
                      isRejected
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-xs font-medium">{isRejected ? 'Unreject' : 'Reject'}</span>
                  </button>
                  
                  {/* ปุ่ม Export */}
                  <button
                    onClick={() => handleExport(index, row)}
                    className="bg-blue-800 hover:bg-blue-700 text-white rounded-lg px-3 py-2 sm:px-4 sm:py-2 flex flex-col items-center gap-1 transition-colors flex-1 sm:flex-none sm:min-w-[80px]"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-medium">Export</span>
                  </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <div className="inline-block bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl shadow-md">
              <span className="text-sm font-semibold text-orange-700">
                แสดง {filteredData.length} จาก {data.length} แถว
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <ImageModal
        imageUrl={selectedImage}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
      
    </>
  );
}

