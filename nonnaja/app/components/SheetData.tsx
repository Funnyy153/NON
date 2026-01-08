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

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  return (
    <>
      <div className="w-full overflow-x-auto p-4">
        <h2 className="text-2xl font-bold mb-4">ข้อมูลจาก Google Sheets</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                {headers.map((header) => (
                  <th
                    key={header}
                    className="border border-gray-300 px-4 py-2 text-left font-semibold"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {headers.map((header) => {
                    const value = row[header] || '';
                    // แยกหลาย Google Drive links
                    const driveLinks = extractDriveLinks(value);
                    const imageUrls = driveLinks
                      .map(link => convertDriveLinkToImageUrl(link))
                      .filter((url): url is string => url !== null);
                    
                    return (
                      <td
                        key={header}
                        className="border border-gray-300 px-4 py-2"
                      >
                        {imageUrls.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {imageUrls.map((imageUrl, imgIndex) => {
                              const fileId = driveLinks[imgIndex]?.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
                              const hasFailed = failedImages.has(imageUrl);
                              
                              return (
                                <div key={imgIndex} className="flex flex-col items-center gap-1">
                                  {!hasFailed ? (
                                    <img
                                      src={imageUrl}
                                      alt={`Image ${imgIndex + 1} from ${header}`}
                                      className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity border border-gray-300"
                                      onClick={() => handleImageClick(imageUrl)}
                                      onError={() => {
                                        setFailedImages(prev => new Set(prev).add(imageUrl));
                                      }}
                                    />
                                  ) : (
                                    <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded border border-gray-300 text-xs text-gray-500 text-center p-1">
                                      ไม่สามารถโหลดรูป
                                    </div>
                                  )}
                                  <a
                                    href={driveLinks[imgIndex]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    เปิดลิงก์
                                  </a>
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

