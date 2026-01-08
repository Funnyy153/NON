'use client';

import { useEffect, useState } from 'react';

interface SheetRow {
  [key: string]: string;
}

export default function SheetData() {
  const [data, setData] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
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
                  // ตรวจสอบว่าเป็น URL หรือไม่
                  const isUrl = value.startsWith('http');
                  return (
                    <td
                      key={header}
                      className="border border-gray-300 px-4 py-2"
                    >
                      {isUrl ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {value}
                        </a>
                      ) : (
                        <span className="break-words">{value}</span>
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
  );
}

