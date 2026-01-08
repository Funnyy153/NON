'use client';

import { useEffect, useState } from 'react';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-2xl font-bold hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
        <img
          src={imageUrl}
          alt="Expanded view"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
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

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/sheets');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result.data);
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

  // ฟังก์ชันกำหนดความกว้างของคอลัมน์ตามชื่อ (return เป็น style object)
  const getColumnStyle = (header: string): { width?: string } => {
    // Debug: log เพื่อดูชื่อ header จริงๆ
    console.log('Checking header:', header);
    
    if (header.toLowerCase().includes('timestamp')) {
      console.log('Matched: Timestamp');
      return { width: '8.33%' }; // Timestamp: 1/12 = 8.33%
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

  return (
    <>
      <div className="w-full w- overflow-x-auto p-2">
        <h2 className="text-2xl font-bold mb-4">ระบบแสดงผล รายงานก่อนเปิดหีบ</h2>
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse border border-gray-300 table-fixed">
            <thead>
              <tr className="bg-gray-100">
                {reorderedHeaders.map((header, index) => {
                  // กำหนดความกว้างตาม index และชื่อ header
                  let columnWidth: string = '';
                  
                  // คอลัมน์ที่ 0: หน่วยเลือกตั้ง
                  if (index === 0) {
                    columnWidth = '8.33%';
                  }
                  // คอลัมน์ที่ 1: Timestamp
                  else if (index === 1) {
                    columnWidth = '8.33%';
                  }
                  // คอลัมน์ที่ 2, 3, 4: รูปภาพ (ป้ายไวนิล, แบบ, รายชื่อ)
                  else if (index >= 2 && index <= 4) {
                    columnWidth = '25%';
                  }
                  // คอลัมน์อื่นๆ
                  else {
                    columnWidth = 'auto';
                  }
                  
                  return (
                    <th
                      key={header}
                      className="border border-gray-300 px-3 py-2 text-center font-semibold text-xl"
                      style={{ width: columnWidth }}
                    >
                      {header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 justify-center">
                  {reorderedHeaders.map((header) => {
                    const value = row[header] || '';
                    // แยกหลาย Google Drive links
                    const driveLinks = extractDriveLinks(value);
                    const imageUrls = driveLinks
                      .map(link => convertDriveLinkToImageUrl(link))
                      .filter((url): url is string => url !== null);
                    
                    return (
                      <td
                        key={header}
                        className="border border-gray-300 px-3 py-2 text-center"
                      >
                        {imageUrls.length > 0 ? (
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {imageUrls.map((imageUrl, imgIndex) => {
                              const fileId = driveLinks[imgIndex]?.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
                              const hasFailed = failedImages.has(imageUrl);
                              
                              return (
                                <div key={imgIndex} className="flex flex-col items-center gap-1">
                                  {!hasFailed ? (
                                    <img
                                      src={imageUrl}
                                      alt={`Image ${imgIndex + 1} from ${header}`}
                                      className="w-32 h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity border border-gray-300"
                                      onClick={() => handleImageClick(imageUrl)}
                                      onError={() => {
                                        setFailedImages(prev => new Set(prev).add(imageUrl));
                                      }}
                                    />
                                  ) : (
                                    <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded border border-gray-300 text-xs text-gray-500 text-center p-1">
                                      ไม่สามารถโหลดรูป
                                    </div>
                                  )}
                                  {/* <a
                                    href={driveLinks[imgIndex]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    เปิดลิงก์
                                  </a> */}
                                </div>
                              );
                            })}
                          </div>
                        ) : value.startsWith('http') ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {value}
                          </a>
                        ) : (
                          <span className="wrap-break-word">{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          พบข้อมูลทั้งหมด {data.length} แถว
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

