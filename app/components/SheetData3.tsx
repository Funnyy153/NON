'use client';

import { useEffect, useState } from 'react';
import FilterBar from './FilterBar';
import { fetchSheetData, updateSheetData, deleteSheetRow } from '../lib/sheetsApi';

interface SheetRow {
  [key: string]: string;
}

// ฟังก์ชันแปลง Google Drive link เป็น image URL
function convertDriveLinkToImageUrl(driveUrl: string): string | null {
  try {
    if (!driveUrl || typeof driveUrl !== 'string') {
      return null;
    }
    
    // ลบ whitespace และ trim
    let cleanUrl = driveUrl.trim();
    
    // ลบ query parameters ที่ไม่จำเป็น (เช่น usp=sharing)
    cleanUrl = cleanUrl.split('&usp=')[0].split('?usp=')[0];
    
    // รองรับหลายรูปแบบของ Google Drive URL:
    // 1. https://drive.google.com/open?id=FILE_ID
    // 2. https://drive.google.com/file/d/FILE_ID/view
    // 3. https://drive.google.com/file/d/FILE_ID/edit
    // 4. https://drive.google.com/uc?id=FILE_ID
    // 5. https://docs.google.com/document/d/FILE_ID/edit (Google Docs)
    // 6. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    
    let fileId: string | null = null;
    
    // รูปแบบ 1: ?id=FILE_ID หรือ &id=FILE_ID
    const match1 = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) {
      fileId = match1[1];
    }
    
    // รูปแบบ 2: /file/d/FILE_ID/ หรือ /document/d/FILE_ID/ หรือ /spreadsheets/d/FILE_ID/
    if (!fileId) {
      const match2 = cleanUrl.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
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
    
    // รูปแบบ 4: /uc?export=view&id=FILE_ID
    if (!fileId) {
      const match4 = cleanUrl.match(/\/uc\?[^&]*id=([a-zA-Z0-9_-]+)/);
      if (match4 && match4[1]) {
        fileId = match4[1];
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

// Modal component สำหรับแสดงรายละเอียดข้อมูล
function DetailModal({
  isOpen,
  onClose,
  rowData,
  headers,
  onImageClick,
  rowIndex,
  onDataUpdate
}: {
  isOpen: boolean;
  onClose: () => void;
  rowData: SheetRow | null;
  headers: string[];
  onImageClick: (imageUrl: string) => void;
  rowIndex: number | null;
  onDataUpdate: (rowIndex: number, columnName: string, value: string) => Promise<void>;
}) {
  const [editedComment, setEditedComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isClosingCase, setIsClosingCase] = useState(false);
  const [isCheckedStatus, setIsCheckedStatus] = useState(false);

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

  // Reset editedComment, isClosingCase และ isCheckedStatus เมื่อ rowData เปลี่ยน
  useEffect(() => {
    if (rowData) {
      const commentHeader = headers.find(h => h.includes('ความเห็น') || h.includes('ความคิดเห็น')) || '';
      const closeCaseHeader = headers.find(h => h.includes('ปิดเคส') || h.includes('ปิด')) || '';
      const statusHeader = headers.find(h => h.includes('สถานะ') || h.toLowerCase().includes('status')) || '';
      
      setEditedComment(rowData[commentHeader] || '');
      
      // ดึงค่าปิดเคสจาก Sheet (0 = ไม่ติ๊ก, 1 = ติ๊ก)
      const closeCaseValue = rowData[closeCaseHeader] || '0';
      setIsClosingCase(closeCaseValue === '1' || closeCaseValue === '1.0');
      
      // ดึงค่าสถานะจาก Sheet (0 = ไม่ติ๊ก, 1 = ติ๊ก)
      const statusValue = rowData[statusHeader] || '0';
      setIsCheckedStatus(statusValue === '1' || statusValue === '1.0');
      
      setSaveStatus('idle');
    }
  }, [rowData, headers]);

  if (!isOpen || !rowData || rowIndex === null) return null;

  // หา headers ที่ต้องการแสดง
  const timestampHeader = headers.find(h => h.toLowerCase().includes('timestamp')) || '';
  const unitHeader = headers.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
  const stageHeader = headers.find(h => h.includes('เหตุเกิดในขั้นตอน') || h.includes('ขั้นตอน')) || '';
  const descriptionHeader = headers.find(h => h.includes('อธิบายสถานการณ์') || h.includes('สถานการณ์')) || '';
  const imageHeader = headers.find(h => h.includes('ภาพเหตุการณ์') || h.includes('หลักฐาน')) || '';
  const commentHeader = headers.find(h => h.includes('ความเห็น') || h.includes('ความคิดเห็น')) || '';
  const statusHeader = headers.find(h => h.includes('สถานะ') || h.toLowerCase().includes('status')) || '';
  const closeCaseHeader = headers.find(h => h.includes('ปิดเคส') || h.includes('ปิด')) || '';

  const timestamp = rowData[timestampHeader] || '';
  const unit = rowData[unitHeader] || '';
  const stage = rowData[stageHeader] || '';
  const description = rowData[descriptionHeader] || '';
  const imageValue = rowData[imageHeader] || '';
  const comment = rowData[commentHeader] || '';
  const status = rowData[statusHeader] || '';
  const closeCase = rowData[closeCaseHeader] || '';

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedComment(e.target.value);
    setSaveStatus('idle');
  };

  const handleCommentBlur = async () => {
    if (editedComment === comment) return; // ไม่มีการเปลี่ยนแปลง

    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      await onDataUpdate(rowIndex, commentHeader, editedComment);
      setSaveStatus('saved');
      // อัปเดต rowData ใน parent component
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving comment:', error);
      setSaveStatus('error');
      // Revert to original value on error
      setEditedComment(comment);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseCaseChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setIsClosingCase(newValue);
    
    if (closeCaseHeader) {
      try {
        await onDataUpdate(rowIndex, closeCaseHeader, newValue ? '1' : '0');
      } catch (error) {
        console.error('Error updating close case:', error);
        // Revert on error
        setIsClosingCase(!newValue);
      }
    }
  };

  // ดึงรูปทั้งหมดจากคอลัมน์ภาพเหตุการณ์และหลักฐาน
  const driveLinks = extractDriveLinks(imageValue);
  const images = driveLinks.map(link => convertDriveLinkToImageUrl(link)).filter((url): url is string => url !== null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 rounded-t-xl sm:rounded-t-2xl px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between z-20"
          style={{ backgroundColor: '#FF6A13' }}
        >
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">รายละเอียดเหตุการณ์</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-orange-200 transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 relative z-0">
          {/* หน่วยเลือกตั้ง */}
          {unit && (
            <div>
              <div className="text-sm font-semibold text-orange-600 mb-1">หน่วยเลือกตั้ง</div>
              <div className="text-base text-gray-800 bg-orange-50 p-3 rounded-lg border border-orange-200 break-words">
                {unit}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {timestamp && (
            <div>
              <div className="text-sm font-semibold text-orange-600 mb-1">Timestamp</div>
              <div className="text-base text-gray-800 bg-orange-50 p-3 rounded-lg border border-orange-200 break-words">
                {timestamp}
              </div>
            </div>
          )}

          {/* เหตุเกิดในขั้นตอนใด */}
          {stage && (
            <div>
              <div className="text-sm font-semibold text-orange-600 mb-1">เหตุเกิดในขั้นตอนใด</div>
              <div className="text-base text-gray-800 bg-orange-50 p-3 rounded-lg border border-orange-200 break-words">
                {stage}
              </div>
            </div>
          )}

          {/* อธิบายสถานการณ์ */}
          {description && (
            <div>
              <div className="text-sm font-semibold text-orange-600 mb-1">อธิบายสถานการณ์</div>
              <div className="text-base text-gray-800 bg-orange-50 p-3 rounded-lg border border-orange-200 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                {description}
              </div>
            </div>
          )}

          {/* ภาพเหตุการณ์และหลักฐาน */}
          {images.length > 0 && (
            <div>
              <div className="text-xs sm:text-sm font-semibold text-orange-600 mb-2">ภาพเหตุการณ์และหลักฐาน</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {images.map((image, imgIndex) => (
                  <div key={imgIndex} className="relative">
                    <img
                      src={image}
                      alt={`รูป ${imgIndex + 1}`}
                      className="w-full h-32 sm:h-40 md:h-48 object-cover rounded-lg cursor-pointer border-2 border-orange-300 shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => onImageClick(image)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ความเห็นเพิ่มเติม */}
          <div>
            <div className="text-sm font-semibold text-orange-600 mb-1 flex items-center gap-2">
              <span>ความเห็นเพิ่มเติม</span>
              {saveStatus === 'saving' && (
                <span className="text-xs text-orange-500">กำลังบันทึก...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-xs text-green-600">บันทึกแล้ว</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-xs text-red-600">บันทึกไม่สำเร็จ</span>
              )}
            </div>
            <textarea
              value={editedComment}
              onChange={handleCommentChange}
              onBlur={handleCommentBlur}
              disabled={isSaving}
              className="w-full text-base text-gray-800 bg-orange-50 p-3 rounded-lg border border-orange-200 break-words resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 disabled:opacity-50"
              placeholder="เพิ่มความเห็น..."
            />
          </div>

          {/* ตรวจสอบแล้ว / ปิดเคส */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              {/* ตรวจสอบแล้ว */}
              {statusHeader && (
                <div className="flex items-center gap-2">
                  {isCheckedStatus ? (
                    <>
                      <span className="text-orange-900 text-xs sm:text-sm font-semibold">ตรวจสอบแล้ว</span>
                      <div 
                        className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-lg flex items-center justify-center shadow-md cursor-pointer hover:bg-green-600 transition-colors"
                        onClick={async () => {
                          try {
                            setIsCheckedStatus(false);
                            await onDataUpdate(rowIndex, statusHeader, '0');
                            // สีพื้นหลังจะถูกอัปเดตอัตโนมัติใน handleDataUpdate
                          } catch (error) {
                            console.error('Error updating status:', error);
                            setIsCheckedStatus(true); // Revert on error
                          }
                        }}
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
                        checked={isCheckedStatus}
                        onChange={async (e) => {
                          try {
                            setIsCheckedStatus(e.target.checked);
                            await onDataUpdate(rowIndex, statusHeader, e.target.checked ? '1' : '0');
                            // สีพื้นหลังจะถูกอัปเดตอัตโนมัติใน handleDataUpdate
                          } catch (error) {
                            console.error('Error updating status:', error);
                            setIsCheckedStatus(!e.target.checked); // Revert on error
                          }
                        }}
                        className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer rounded-md border-2 border-orange-400 text-orange-600"
                      />
                    </>
                  )}
                </div>
              )}

              {/* ปิดเคส */}
              {closeCaseHeader && (
                <div className="flex items-center gap-2">
                  {isClosingCase ? (
                    <>
                      <span className="text-orange-900 text-xs sm:text-sm font-semibold">ปิดเคส</span>
                      <div 
                        className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-lg flex items-center justify-center shadow-md cursor-pointer hover:bg-green-600 transition-colors"
                        onClick={async () => {
                          try {
                            setIsClosingCase(false);
                            await onDataUpdate(rowIndex, closeCaseHeader, '0');
                          } catch (error) {
                            console.error('Error updating close case:', error);
                            setIsClosingCase(true); // Revert on error
                          }
                        }}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-orange-600 text-xs sm:text-sm">ปิดเคส</span>
                      <input
                        type="checkbox"
                        checked={isClosingCase}
                        onChange={handleCloseCaseChange}
                        className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer rounded-md border-2 border-orange-400 text-orange-600"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-3 py-3 sm:px-6 sm:py-4 border-t border-orange-200 bg-white rounded-b-xl sm:rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg font-semibold text-sm sm:text-base text-white transition-colors"
            style={{ backgroundColor: '#FF6A13' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e55a0f'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF6A13'}
          >
            ปิด
          </button>
        </div>
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

export default function SheetData3() {
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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<SheetRow | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState({
    checked: true,
    unchecked: true,
  });
  const [showClosedCases, setShowClosedCases] = useState(true);
  const [closedRows, setClosedRows] = useState<Set<number>>(new Set());

  // ฟังก์ชันสำหรับ fetch และ process ข้อมูล
  const fetchAndProcessData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const result = await fetchSheetData('sheets3');
      const rawData = result.data;
      
      // เปรียบเทียบกับข้อมูลเดิมเพื่อดูว่ามีข้อมูลใหม่หรือไม่
      const currentDataLength = data.length;
      const hasNewData = rawData && rawData.length > currentDataLength;
      
      setData(rawData);
      
      // โหลดสถานะ "ตรวจสอบแล้ว" และ "ปิดเคส" จาก Sheet
      // หา column "สถานะ" และ "ปิดเคส" จาก headers
      if (rawData && rawData.length > 0) {
        const headers = Object.keys(rawData[0]);
        const statusColumn = headers.find(h => 
          h && (h.includes('สถานะ') || h.toLowerCase().includes('status'))
        );
        const closeCaseColumn = headers.find(h => 
          h && (h.includes('ปิดเคส') || h.includes('ปิด'))
        );
        
        if (statusColumn) {
          const checkedIndices = new Set<number>();
          rawData.forEach((row: SheetRow, index: number) => {
            const statusValue = row[statusColumn];
            // ถ้าค่าเป็น "1" หรือ "1.0" หรือ "ตรวจสอบแล้ว" ให้ mark เป็น checked
            if (statusValue === '1' || statusValue === '1.0' || statusValue === 'ตรวจสอบแล้ว') {
              checkedIndices.add(index);
            }
          });
          setCheckedRows(checkedIndices);
          
          if (isInitialLoad) {
            console.log('Loaded checked rows from Sheet:', checkedIndices.size);
          } else if (hasNewData) {
            console.log('New data detected! Updated from', currentDataLength, 'to', rawData.length, 'rows');
          }
        }

        if (closeCaseColumn) {
          const closedIndices = new Set<number>();
          rawData.forEach((row: SheetRow, index: number) => {
            const closeCaseValue = row[closeCaseColumn];
            // ถ้าค่าเป็น "1" หรือ "1.0" ให้ mark เป็น closed
            if (closeCaseValue === '1' || closeCaseValue === '1.0') {
              closedIndices.add(index);
            }
          });
          setClosedRows(closedIndices);
          
          if (isInitialLoad) {
            console.log('Loaded closed rows from Sheet:', closedIndices.size);
          }
        }
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

  // ฟังก์ชันคำนวณและอัปเดตสีพื้นหลังของการ์ด
  const updateCardColor = async (rowIndex: number) => {
    try {
      // รอสักครู่เพื่อให้ Sheet อัปเดตเสร็จก่อน
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ดึงข้อมูลล่าสุดจาก Sheet
      const fetchResult = await fetchSheetData('sheets3');
      
      // อัปเดต data state ด้วยข้อมูลล่าสุด
      if (fetchResult.data && fetchResult.data[rowIndex]) {
        const updatedRow = fetchResult.data[rowIndex];
        setData(prevData => {
          const newData = [...prevData];
          if (newData[rowIndex]) {
            newData[rowIndex] = updatedRow;
          }
          return newData;
        });
      }

      const row = fetchResult.data && fetchResult.data[rowIndex] ? fetchResult.data[rowIndex] : data[rowIndex];
      if (!row) return;

      const statusHeader = headers.find(h => h.includes('สถานะ') || h.toLowerCase().includes('status')) || '';
      const closeCaseHeader = headers.find(h => h.includes('ปิดเคส') || h.includes('ปิด')) || '';
      const colorHeader = headers.find(h => h.includes('สี') || h.toLowerCase().includes('color')) || '';

      if (!colorHeader) return;

      // อ่านค่าจาก Sheet (สถานะและปิดเคส)
      const status = row[statusHeader] || '0';
      const closeCase = row[closeCaseHeader] || '0';

      // คำนวณสี: ปิดเคส=1 → 2 (เขียว), สถานะ=1 → 1 (ขาว), อื่นๆ → 0 (ส้ม)
      let newColorValue = '0';
      if (closeCase === '1' || closeCase === '1.0') {
        newColorValue = '2';
      } else if (status === '1' || status === '1.0') {
        newColorValue = '1';
      } else {
        newColorValue = '0';
      }

      // อัปเดตค่าใน Sheet
      try {
        await updateSheetData('sheets3', rowIndex, colorHeader, newColorValue);
        
        // อัปเดตข้อมูลใน state
        setData(prevData => {
          const newData = [...prevData];
          if (newData[rowIndex]) {
            newData[rowIndex] = { ...newData[rowIndex], [colorHeader]: newColorValue };
          }
          return newData;
        });

        // อัปเดต selectedRowData ใน modal ถ้าเป็นแถวเดียวกัน
        if (detailModalOpen && selectedRowIndex === rowIndex) {
          setSelectedRowData(prev => {
            if (!prev) return prev;
            return { ...prev, [colorHeader]: newColorValue };
          });
        }
      } catch (error) {
        console.error('Error updating card color:', error);
      }
    } catch (error) {
      console.error('Error updating card color:', error);
    }
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
      
      await updateSheetData('sheets3', rowIndex, statusColumn, newCheckedState ? '1' : '0');
      console.log('Sheet updated successfully');

      // อัปเดตข้อมูลใน state
      setData(prevData => {
        const newData = [...prevData];
        if (newData[rowIndex]) {
          newData[rowIndex] = { ...newData[rowIndex], [statusColumn]: newCheckedState ? '1' : '0' };
        }
        return newData;
      });

      // อัปเดต selectedRowData ใน modal ถ้าเป็นแถวเดียวกันและ modal เปิดอยู่
      if (detailModalOpen && selectedRowIndex === rowIndex) {
        setSelectedRowData(prev => {
          if (!prev) return prev;
          return { ...prev, [statusColumn]: newCheckedState ? '1' : '0' };
        });
      }

      // อัปเดตสีพื้นหลังของการ์ด (อ่านค่าจาก Sheet)
      await updateCardColor(rowIndex);
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
    }
  };

  const handleOpenDetailModal = (row: SheetRow, rowIndex: number) => {
    setSelectedRowData(row);
    setSelectedRowIndex(rowIndex);
    setDetailModalOpen(true);
  };

  const handleDataUpdate = async (rowIndex: number, columnName: string, value: string) => {
    try {
      await updateSheetData('sheets3', rowIndex, columnName, value);
      console.log('Data updated successfully');

      // อัปเดตข้อมูลใน state
      setData(prevData => {
        const newData = [...prevData];
        if (newData[rowIndex]) {
          newData[rowIndex] = { ...newData[rowIndex], [columnName]: value };
        }
        return newData;
      });

      // อัปเดต selectedRowData ถ้าเป็นแถวเดียวกัน
      if (selectedRowIndex === rowIndex) {
        setSelectedRowData(prev => {
          if (!prev) return prev;
          return { ...prev, [columnName]: value };
        });
      }

      // อัปเดต checkedRows ถ้าเป็นการอัปเดตสถานะ
      const statusHeader = headers.find(h => 
        h && (h.includes('สถานะ') || h.toLowerCase().includes('status'))
      );
      if (statusHeader && columnName === statusHeader) {
        setCheckedRows(prev => {
          const newSet = new Set(prev);
          if (value === '1' || value === '1.0') {
            newSet.add(rowIndex);
          } else {
            newSet.delete(rowIndex);
          }
          return newSet;
        });
      }

      // อัปเดต closedRows ถ้าเป็นการอัปเดตปิดเคส
      const closeCaseHeader = headers.find(h => 
        h && (h.includes('ปิดเคส') || h.includes('ปิด'))
      );
      if (closeCaseHeader && columnName === closeCaseHeader) {
        setClosedRows(prev => {
          const newSet = new Set(prev);
          if (value === '1' || value === '1.0') {
            newSet.add(rowIndex);
          } else {
            newSet.delete(rowIndex);
          }
          return newSet;
        });
      }

      // อัปเดตสีพื้นหลังของการ์ดเมื่อสถานะหรือปิดเคสเปลี่ยน (อ่านค่าจาก Sheet)
      if ((statusHeader && columnName === statusHeader) || (closeCaseHeader && columnName === closeCaseHeader)) {
        await updateCardColor(rowIndex);
      }
    } catch (error) {
      console.error('Error updating data:', error);
      throw error;
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
      await deleteSheetRow('sheets3', rowIndex);
      console.log('Row deleted successfully');

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

  // Helper function to calculate card color value
  const getCardColorValue = (row: SheetRow, rowIndex: number): string => {
    const statusHeader = headers.find(h => h.includes('สถานะ') || h.toLowerCase().includes('status')) || '';
    const closeCaseHeader = headers.find(h => h.includes('ปิดเคส') || h.includes('ปิด')) || '';
    const colorHeader = headers.find(h => h.includes('สี') || h.toLowerCase().includes('color')) || '';
    
    const status = row[statusHeader] || '0';
    const closeCase = row[closeCaseHeader] || '0';
    const colorValue = row[colorHeader] || '';
    
    // ถ้ามีค่าใน Sheet ใช้ค่าใน Sheet
    if (colorValue && (colorValue === '0' || colorValue === '1' || colorValue === '2')) {
      return colorValue;
    }
    
    // คำนวณจากสถานะและปิดเคส
    if (closeCase === '1' || closeCase === '1.0') {
      return '2'; // เขียว
    } else if (status === '1' || status === '1.0') {
      return '1'; // ขาว
    } else {
      return '0'; // ส้ม
    }
  };

  // Filter and sort data by color: ส้ม (0) → ขาว (1) → เขียว (2)
  // Within each color group, sort by newest first (higher index = newer)
  const filteredDataWithIndex = data
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => {
      // Filter by search term (หน่วยเลือกตั้ง)
      const unitHeader = headers.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
      const unit = row[unitHeader] || '';
      const matchesSearch = !searchTerm || unit.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by status
      const isChecked = checkedRows.has(index);
      const matchesStatus = (isChecked && statusFilters.checked) || (!isChecked && statusFilters.unchecked);
      
      // Filter by close case (ถ้า showClosedCases = false ให้ซ่อนแถวที่ปิดเคสแล้ว)
      const isClosed = closedRows.has(index);
      const matchesCloseCase = showClosedCases || !isClosed;
      
      return matchesSearch && matchesStatus && matchesCloseCase;
    })
    .map(({ row, index }) => ({
      row,
      index,
      colorValue: getCardColorValue(row, index)
    }))
    .sort((a, b) => {
      // เรียงตามสี: ส้ม (0) → ขาว (1) → เขียว (2)
      const colorOrder = parseInt(a.colorValue) - parseInt(b.colorValue);
      if (colorOrder !== 0) {
        return colorOrder;
      }
      // ในแต่ละสี เรียงจากใหม่สุดไปเก่าสุด (index สูงสุดก่อน)
      return b.index - a.index;
    });

  const filteredData = filteredDataWithIndex.map(item => item.row);

  // Create a mapping from filtered index to original index
  const originalIndexMap = new Map<number, number>();
  filteredDataWithIndex.forEach((item, filteredIdx) => {
    originalIndexMap.set(filteredIdx, item.index);
  });

  return (
    <>
      <div className="w-full overflow-x-auto p-2 sm:p-4">
        <div className=" rounded-2xl ">
          {/* Filter Bar */}
          <FilterBar
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilters}
            showClosedCases={showClosedCases}
            onCloseCaseFilterChange={setShowClosedCases}
          />
          
          <div className="w-full space-y-3 sm:space-y-5">
            {filteredData.map((row, filteredIdx) => {
              const index = originalIndexMap.get(filteredIdx) ?? filteredIdx;
              const isChecked = checkedRows.has(index);
              const isRejected = rejectedRows.has(index);
              const unitHeader = reorderedHeaders.find(h => h.includes('หน่วยเลือกตั้ง')) || '';
              const timestampHeader = reorderedHeaders.find(h => h.toLowerCase().includes('timestamp')) || '';
              const imageHeader = reorderedHeaders.find(h => h.includes('ภาพเหตุการณ์') || h.includes('หลักฐาน')) || '';
              const statusHeader = headers.find(h => h.includes('สถานะ') || h.toLowerCase().includes('status')) || '';
              const closeCaseHeader = headers.find(h => h.includes('ปิดเคส') || h.includes('ปิด')) || '';
              const colorHeader = headers.find(h => h.includes('สี') || h.toLowerCase().includes('color')) || '';
              
              const unit = row[unitHeader] || '';
              const timestamp = row[timestampHeader] || '';
              const imageValue = row[imageHeader] || '';
              const status = row[statusHeader] || '0';
              const closeCase = row[closeCaseHeader] || '0';
              const colorValue = row[colorHeader] || '';
              
              // คำนวณสีพื้นหลัง: ถ้ามีค่าใน Sheet ใช้ค่าใน Sheet, ถ้าไม่มีคำนวณจากสถานะและปิดเคส
              let cardColor = 'bg-orange-50';
              let cardBorder = 'border-orange-200';
              let cardColorValue = '0';
              
              if (colorValue && (colorValue === '0' || colorValue === '1' || colorValue === '2')) {
                // ใช้ค่าจาก Sheet
                cardColorValue = colorValue;
                if (colorValue === '2') {
                  cardColor = 'bg-green-50';
                  cardBorder = 'border-green-200';
                } else if (colorValue === '1') {
                  cardColor = 'bg-white';
                  cardBorder = 'border-gray-200';
                } else {
                  cardColor = 'bg-orange-50';
                  cardBorder = 'border-orange-200';
                }
              } else {
                // คำนวณจากสถานะและปิดเคส
                if (closeCase === '1' || closeCase === '1.0') {
                  cardColor = 'bg-green-50';
                  cardBorder = 'border-green-200';
                  cardColorValue = '2';
                } else if (status === '1' || status === '1.0') {
                  cardColor = 'bg-white';
                  cardBorder = 'border-gray-200';
                  cardColorValue = '1';
                } else {
                  cardColor = 'bg-orange-50';
                  cardBorder = 'border-orange-200';
                  cardColorValue = '0';
                }
              }
              
              // ดึงรูปทั้งหมดจากคอลัมน์ภาพเหตุการณ์และหลักฐาน
              const driveLinks = extractDriveLinks(imageValue);
              const images = driveLinks.map(link => convertDriveLinkToImageUrl(link)).filter((url): url is string => url !== null);
              
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
                  <div className="text-orange-900 font-medium w-full sm:w-auto sm:min-w-[120px] md:min-w-[140px]">
                    <div className="text-xs text-orange-600 mb-1">Update Time</div>
                    <div className="text-xs sm:text-sm font-semibold break-words">{timestamp}</div>
                  </div>
                  
                  {/* รูปภาพในแถวเดียวกัน */}
                  <div className="flex-1 flex items-center gap-2 justify-start overflow-x-auto">
                    {images.length > 0 ? (
                      images.slice(0, 10).map((image, imgIndex) => (
                        <div key={imgIndex} className="flex-shrink-0 w-[90px] sm:w-[100px] md:w-[110px]">
                          {!failedImages.has(image) ? (
                            <img
                              src={image}
                              alt={`รูป ${imgIndex + 1}`}
                              className="w-full h-[80px] sm:h-[90px] md:h-[100px] object-cover rounded-lg cursor-pointer border-2 border-orange-300 shadow-md"
                              onClick={() => handleImageClick(image)}
                              onError={() => {
                                setFailedImages(prev => new Set(prev).add(image));
                              }}
                            />
                          ) : (
                            <div className="w-full h-[80px] sm:h-[90px] md:h-[100px] bg-gray-300 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                              <span className="text-xs text-gray-500">Error</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex-shrink-0 w-[90px] sm:w-[100px] md:w-[110px]">
                        <div className="w-full h-[80px] sm:h-[90px] md:h-[100px] bg-gray-200 rounded-lg border-2 border-orange-300 flex items-center justify-center">
                          <span className="text-xs text-gray-400">ไม่มีรูป</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* สถานะตรวจสอบแล้ว */}
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[140px] justify-center sm:justify-start">
                    {isChecked ? (
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
                  
                  {/* ปุ่ม Reject และ Detail */}
                  <div className="flex flex-row gap-2 w-full sm:w-auto">
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
                    <span className="text-xs font-medium">Reject</span>
                  </button>
                  
                  {/* ปุ่ม Detail */}
                  <button
                    onClick={() => handleOpenDetailModal(row, index)}
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-3 py-2 sm:px-4 sm:py-2 flex flex-col items-center gap-1 transition-colors flex-1 sm:flex-none sm:min-w-[80px]"
                    style={{ backgroundColor: '#FF6A13' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e55a0f'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF6A13'}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-xs font-medium">Detail</span>
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
      
      <DetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedRowData(null);
          setSelectedRowIndex(null);
        }}
        rowData={selectedRowData}
        headers={headers}
        onImageClick={handleImageClick}
        rowIndex={selectedRowIndex}
        onDataUpdate={handleDataUpdate}
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
