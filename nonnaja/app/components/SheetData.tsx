'use client';

import { useEffect, useState } from 'react';
import FilterBar from './FilterBar';

interface SheetRow {
  [key: string]: string;
}

// ฟังก์ชันแปลง Google Drive link เป็น image URL
function convertDriveLinkToImageUrl(driveUrl: string): string | null {
  try {
    // ดึง file ID จาก Google Drive URL
    // รูปแบบ: https://drive.google.com/open?id=FILE_ID
    const match = driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      // ใช้ API route ของเราเพื่อดึงรูปภาพ (รองรับ private files)
      return `/api/drive-image?id=${fileId}`;
    }
    return null;
  } catch {
    return null;
  }
}

// ฟังก์ชันแยกหลาย Google Drive links จาก text
function extractDriveLinks(text: string): string[] {
  // หา Google Drive URLs ทั้งหมดใน text
  const urlPattern = /https?:\/\/drive\.google\.com\/[^\s]+/g;
  const matches = text.match(urlPattern);
  return matches || [];
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full">
       
        <img
          src={imageUrl}
          alt="Expanded view"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl bg-white p-2"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

// Modal component สำหรับยืนยันการลบ
function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  unitName
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  unitName?: string;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl p-8 max-w-md w-full"
        style={{ backgroundColor: '#FF6A13' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-4"
               style={{ 
                 backgroundColor: 'rgba(255, 255, 255, 0.15)',
                 borderColor: 'rgba(255, 255, 255, 0.3)'
               }}>
            <span className="text-4xl font-bold text-white">!</span>
          </div>
        </div>

        {/* Main Question */}
        <h3 className="text-2xl font-bold text-white text-center mb-3">
          คุณแน่ใจหรือไม่?
        </h3>

        {/* Warning Message */}
        <div className="mb-6 text-center">
          <p className="text-white/90 text-sm mb-3">
            คุณจะไม่สามารถกู้คืนรายการนี้ได้!
          </p>
          {unitName && (
            <p className="text-white/80 text-sm  p-3 rounded-lg">
              <span className="font-semibold text-black">หน่วย:</span> <span className="text-black">{unitName}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition-colors backdrop-blur-sm"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-6 py-2.5 rounded-lg bg-white text-orange-600 hover:bg-orange-50 font-bold transition-colors shadow-lg"
            style={{ color: '#FF6A13' }}
          >
            ใช่, ลบเลย!
          </button>
        </div>
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState({
    checked: true,
    unchecked: true,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/sheets');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result.data);
        
        // โหลดสถานะ "ตรวจสอบแล้ว" จาก Sheet
        // หา column "สถานะ" จาก headers
        if (result.data && result.data.length > 0) {
          const headers = Object.keys(result.data[0]);
          const statusColumn = headers.find(h => 
            h && (h.includes('สถานะ') || h.toLowerCase().includes('status'))
          );
          
          if (statusColumn) {
            const checkedIndices = new Set<number>();
            result.data.forEach((row: SheetRow, index: number) => {
              const statusValue = row[statusColumn];
              // ถ้าค่าเป็น "1" หรือ "1.0" หรือ "ตรวจสอบแล้ว" ให้ mark เป็น checked
              if (statusValue === '1' || statusValue === '1.0' || statusValue === 'ตรวจสอบแล้ว') {
                checkedIndices.add(index);
              }
            });
            setCheckedRows(checkedIndices);
            console.log('Loaded checked rows from Sheet:', checkedIndices.size);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
        <div className="text-lg">ไม่พบข้อมูล</div>
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
      
      const response = await fetch('/api/sheets/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rowIndex: rowIndex, // 0-based index ของ data array
          value: newCheckedState ? '1' : '0', // ติ๊ก = '1', ไม่ติ๊ก = '0'
          columnName: statusColumn
        }),
      });
      
      console.log('Update response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Update error data:', errorData);
        } catch {
          const responseText = await response.text();
          console.error('Update error response text:', responseText);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}`, details: responseText };
        }
        throw new Error(errorData.error || errorData.message || 'Failed to update sheet');
      }
      
      const result = await response.json();
      console.log('Sheet updated successfully:', result);
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
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // ลอง parse error message เพื่อดู details
        try {
          const errorMatch = error.message.match(/details[:\s]+(.+)/i);
          if (errorMatch) {
            errorDetails = errorMatch[1];
          }
        } catch {}
      }
      
      const fullMessage = `ไม่สามารถอัปเดต Google Sheet ได้\n\n${errorMessage}${errorDetails ? '\n\nรายละเอียด: ' + errorDetails : ''}\n\nกรุณาตรวจสอบ:\n1. Google Apps Script ถูก deploy แล้ว\n2. Web App ตั้งค่า "Anyone" access\n3. Apps Script มี function doPost และรองรับ action 'update'\n4. ดู console log สำหรับรายละเอียดเพิ่มเติม`;
      
      alert(fullMessage);
    }
  };

  const handleRejectChange = (rowIndex: number) => {
    // เปิด modal ยืนยันการลบ
    setRowToDelete(rowIndex);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (rowToDelete === null) return;

    const rowIndex = rowToDelete;

    try {
      // เรียก API เพื่อลบแถวใน Google Sheet
      const response = await fetch('/api/sheets/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rowIndex: rowIndex, // 0-based index ของ data array
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || errorData.message || 'Failed to delete row');
      }

      const result = await response.json();
      console.log('Row deleted:', result);

      // ลบการ์ดออกจาก state (ลบข้อมูลออกจาก array)
      setData(prevData => prevData.filter((_, index) => index !== rowIndex));
      
      // ลบออกจาก rejectedRows และ checkedRows ด้วย
      setRejectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowIndex);
        // ลบ index ที่มากกว่า rowIndex ออกด้วย (เพราะ array ลดลง)
        const updatedSet = new Set<number>();
        newSet.forEach(idx => {
          if (idx < rowIndex) {
            updatedSet.add(idx);
          } else if (idx > rowIndex) {
            updatedSet.add(idx - 1);
          }
        });
        return updatedSet;
      });
      
      setCheckedRows(prev => {
        const newSet = new Set(prev);
        const updatedSet = new Set<number>();
        newSet.forEach(idx => {
          if (idx < rowIndex) {
            updatedSet.add(idx);
          } else if (idx > rowIndex) {
            updatedSet.add(idx - 1);
          }
        });
        return updatedSet;
      });
    } catch (error) {
      console.error('Error deleting row:', error);
      const errorMessage = error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ';
      alert(`ไม่สามารถลบแถวได้\n\n${errorMessage}`);
    } finally {
      setRowToDelete(null);
    }
  };

  // ฟังก์ชันดาวน์โหลดรูปทั้ง 3 รูป
  const handleExport = async (rowIndex: number, row: SheetRow) => {
    try {
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
      
      const unit = row[unitHeader] || 'unknown';
      const timestamp = row[timestampHeader] || '';
      
      // แปลง timestamp เป็นชื่อไฟล์ (แทน / และ : ด้วย -)
      const timestampForFilename = timestamp
        .replace(/\//g, '-')
        .replace(/:/g, '-')
        .replace(/\s+/g, '_')
        .trim();
      
      const baseFilename = `${unit}_${timestampForFilename}`.replace(/[^a-zA-Z0-9_\-ก-๙]/g, '_');

      // ดาวน์โหลดรูปแต่ละรูป
      for (let i = 0; i < imageHeaders.length; i++) {
        const header = imageHeaders[i];
        const value = row[header] || '';
        const driveLinks = extractDriveLinks(value);
        
        // ดาวน์โหลดทุกรูปในคอลัมน์นั้น
        for (let j = 0; j < driveLinks.length; j++) {
          const driveLink = driveLinks[j];
          const imageUrl = convertDriveLinkToImageUrl(driveLink);
          
          if (imageUrl) {
            try {
              // ดาวน์โหลดรูป
              const response = await fetch(imageUrl);
              if (!response.ok) {
                console.error(`Failed to fetch image: ${response.statusText}`);
                continue;
              }
              const blob = await response.blob();
              
              // สร้างชื่อไฟล์
              const imageType = header.includes('ป้ายไวนิล') ? 'ป้ายไวนิล' :
                               header.includes('แบบ') ? 'แบบ' :
                               header.includes('รายชื่อ') ? 'รายชื่อ' : 'image';
              const filename = `${baseFilename}_${imageType}${j > 0 ? `_${j + 1}` : ''}.jpg`;
              
              // สร้าง link และดาวน์โหลด
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              
              // รอสักครู่ก่อนดาวน์โหลดรูปถัดไป
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`Error downloading image from ${header}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error exporting images:', error);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ');
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
  const filteredData = data.filter((row, index) => {
    // Filter by search term (หน่วยเลือกตั้ง)
    const unitHeader = headers.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
    const unit = row[unitHeader] || '';
    const matchesSearch = !searchTerm || unit.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    const isChecked = checkedRows.has(index);
    const matchesStatus = (isChecked && statusFilters.checked) || (!isChecked && statusFilters.unchecked);
    
    return matchesSearch && matchesStatus;
  }).reverse(); // เรียงลำดับจากล่างขึ้นบน (ข้อมูลใหม่สุดอยู่บน)

  // Create a mapping from filtered index to original index (เรียงจากล่างขึ้นบน)
  const originalIndexMap = new Map<number, number>();
  let filteredIndex = 0;
  // วนลูปจากท้ายไปหน้า (reverse order) เพื่อให้ข้อมูลใหม่สุดอยู่บน
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const originalIndex = i;
    const unitHeader = headers.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
    const unit = row[unitHeader] || '';
    const matchesSearch = !searchTerm || unit.toLowerCase().includes(searchTerm.toLowerCase());
    const isChecked = checkedRows.has(originalIndex);
    const matchesStatus = (isChecked && statusFilters.checked) || (!isChecked && statusFilters.unchecked);
    
    if (matchesSearch && matchesStatus) {
      originalIndexMap.set(filteredIndex, originalIndex);
      filteredIndex++;
    }
  }

  return (
    <>
      <div className="w-full overflow-x-auto p-4">
        <div className=" rounded-2xl ">
          {/* Filter Bar */}
          <FilterBar
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilters}
          />
          
          {/* <h2 className="text-3xl font-bold mb-6 text-center text-orange-800 drop-shadow-sm">
            ระบบแสดงผล รายงานก่อนเปิดหีบํ
          </h2> */}
          <div className="w-full space-y-5">
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
                const driveLinks = extractDriveLinks(value);
                if (driveLinks.length > 0) {
                  const imageUrl = convertDriveLinkToImageUrl(driveLinks[0]);
                  return imageUrl;
                }
                return null;
              };
              
              const vinylImage = getFirstImage(vinylHeader);
              const formImage = getFirstImage(formHeader);
              const committeeImage = getFirstImage(committeeHeader);
              
              return (
                <div
                  key={index}
                  className="bg-orange-50 rounded-xl p-6 flex items-center gap-5 shadow-lg border-2 border-orange-200"
                >
                  {/* ปุ่มสีส้มด้านซ้าย */}
                  <div
                    style={{ backgroundColor: '#FF6A13' }}
                    className="rounded-lg px-5 py-4 text-white font-semibold w-[160px] text-center flex items-center justify-center"
                  >
                    <div className="text-base wrap-break-word">{unit || 'หน่วย'}</div>
                  </div>
                  
                  {/* Update Time */}
                  <div className="text-orange-900 font-medium min-w-[140px]">
                    <div className="text-xs text-orange-600 mb-1">Update Time</div>
                    <div className="text-sm font-semibold">{timestamp}</div>
                  </div>
                  
                  {/* รูปภาพ 3 ส่วนเท่าๆ กัน */}
                  <div className="flex items-center gap-3 flex-1 justify-center">
                    {/* รูปที่ 1: ป้ายไวนิล */}
                    <div className="flex-1 flex justify-center">
                      {vinylImage ? (
                        <div className="relative w-full max-w-[140px]">
                          {!failedImages.has(vinylImage) ? (
                            <img
                              src={vinylImage}
                              alt="ป้ายไวนิล"
                              className="w-full h-[140px] object-cover rounded-lg cursor-pointer border-2 border-orange-300 shadow-md"
                              onClick={() => handleImageClick(vinylImage)}
                              onError={() => {
                                setFailedImages(prev => new Set(prev).add(vinylImage));
                              }}
                            />
                          ) : (
                            <div className="w-full h-[140px] bg-gray-300 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                              <span className="text-xs text-gray-500">Error</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full max-w-[140px] h-[140px] bg-gray-200 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                          <span className="text-xs text-gray-400">ไม่มีรูป</span>
                        </div>
                      )}
                    </div>
                    
                    {/* รูปที่ 2: แบบ */}
                    <div className="flex-1 flex justify-center">
                      {formImage ? (
                        <div className="relative w-full max-w-[140px]">
                          {!failedImages.has(formImage) ? (
                            <img
                              src={formImage}
                              alt="แบบ"
                              className="w-full h-[140px] object-cover rounded-lg cursor-pointer border-2 border-orange-300 shadow-md"
                              onClick={() => handleImageClick(formImage)}
                              onError={() => {
                                setFailedImages(prev => new Set(prev).add(formImage));
                              }}
                            />
                          ) : (
                            <div className="w-full h-[140px] bg-gray-300 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                              <span className="text-xs text-gray-500">Error</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full max-w-[140px] h-[140px] bg-gray-200 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                          <span className="text-xs text-gray-400">ไม่มีรูป</span>
                        </div>
                      )}
                    </div>
                    
                    {/* รูปที่ 3: รายชื่อ */}
                    <div className="flex-1 flex justify-center">
                      {committeeImage ? (
                        <div className="relative w-full max-w-[140px]">
                          {!failedImages.has(committeeImage) ? (
                            <img
                              src={committeeImage}
                              alt="รายชื่อ"
                              className="w-full h-[140px] object-cover rounded-lg cursor-pointer border-2 border-orange-300 shadow-md"
                              onClick={() => handleImageClick(committeeImage)}
                              onError={() => {
                                setFailedImages(prev => new Set(prev).add(committeeImage));
                              }}
                            />
                          ) : (
                            <div className="w-full h-[140px] bg-gray-300 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                              <span className="text-xs text-gray-500">Error</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full max-w-[140px] h-[140px] bg-gray-200 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                          <span className="text-xs text-gray-400">ไม่มีรูป</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* สถานะตรวจสอบแล้ว */}
                  <div className="flex items-center gap-2 min-w-[140px]">
                    {isChecked ? (
                      <>
                        <span className="text-orange-900 text-sm font-semibold">ตรวจสอบแล้ว</span>
                        <div 
                          className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shadow-md cursor-pointer hover:bg-green-600 transition-colors"
                          onClick={() => handleCheckboxChange(index)}
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-orange-600 text-sm">ยังไม่ได้ตรวจสอบ</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(index)}
                          className="w-6 h-6 cursor-pointer rounded-md border-2 border-orange-400 text-orange-600"
                        />
                      </>
                    )}
                  </div>
                  
                  {/* ปุ่ม Reject */}
                  <button
                    onClick={() => handleRejectChange(index)}
                    className={`rounded-lg px-4 py-2 flex flex-col items-center gap-1 transition-colors min-w-[80px] ${
                      isRejected
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-xs font-medium">Reject</span>
                  </button>
                  
                  {/* ปุ่ม Export */}
                  <button
                    onClick={() => handleExport(index, row)}
                    className="bg-blue-800 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex flex-col items-center gap-1 transition-colors min-w-[80px]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-medium">Export</span>
                  </button>
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
      
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRowToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        unitName={rowToDelete !== null ? (() => {
          const unitHeader = headers.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
          return data[rowToDelete]?.[unitHeader] || '';
        })() : undefined}
      />
    </>
  );
}

