// Utility functions for direct Google Sheets and Apps Script API calls
// These functions work with static export (no server-side API routes needed)

// Sheet configurations
export const SHEET_CONFIGS = {
  sheets: {
    SHEET_ID: '1vctOoJm4pLcbNfh6PRPNAQI3pW_GKPw3Sy3eoMqBh38',
    GID: '44722663',
  },
  sheets2: {
    SHEET_ID: '1wl4cnLPCunVzzzzm6RsxOXsaJC3fS-Fu-7ZKrCCks3A',
    GID: '598449528',
  },
  sheets3: {
    SHEET_ID: '104j-UWwg5mwAUwCwAWAVr-Hw6Ggbj9I9KpqRUra9ITA',
    GID: '1813370749',
  },
};

// Google Apps Script URL (fallback to production URL)
const getAppsScriptUrl = () => {
  // In browser environment, we can't access process.env directly
  // So we'll use the production URL directly
  // If you need to use a different URL, you can set it via window.__APPS_SCRIPT_URL__ in your HTML
  if (typeof window !== 'undefined' && (window as any).__APPS_SCRIPT_URL__) {
    return (window as any).__APPS_SCRIPT_URL__;
  }
  return 'https://script.google.com/macros/s/AKfycbzCxRXVyHg1YDQUWsFI_EbQEdQH6kZzR8QDKtrV00zDxoJhioOVyxYgFlrw5DeutgfSoA/exec';
};

// Fetch data from Google Sheets
export async function fetchSheetData(sheetType: 'sheets' | 'sheets2' | 'sheets3') {
  const config = SHEET_CONFIGS[sheetType];
  const jsonUrl = `https://docs.google.com/spreadsheets/d/${config.SHEET_ID}/gviz/tq?tqx=out:json&gid=${config.GID}`;
  
  try {
    const response = await fetch(jsonUrl, {
      cache: 'no-store',
      mode: 'cors', // Explicitly set CORS mode
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }

    const jsonText = await response.text();
  
  // Google Sheets JSON format has prefix "google.visualization.Query.setResponse(" and suffix ");"
  const jsonMatch = jsonText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Google Sheets');
  }
  
  const jsonData = JSON.parse(jsonMatch[1]);
  
  if (!jsonData.table || !jsonData.table.rows) {
    return { data: [] };
  }
  
  const headers = jsonData.table.cols.map((col: any) => col.label || '');
  const rows = jsonData.table.rows;
  
  const data = rows.map((row: any) => {
    const rowData: Record<string, string> = {};
    headers.forEach((header: string, index: number) => {
      const cell = row.c[index];
      let value = '';
      
      if (cell) {
        // Handle Timestamp column
        if (header.toLowerCase().includes('timestamp')) {
          let date: Date | null = null;
          
          if (cell.v !== null && cell.v !== undefined) {
            if (cell.v instanceof Date) {
              date = cell.v;
            } else if (typeof cell.v === 'object' && 'getTime' in cell.v) {
              date = new Date(cell.v);
            } else if (typeof cell.v === 'number') {
              // Google Sheets date serial number
              date = new Date((cell.v - 25569) * 86400 * 1000);
            } else if (typeof cell.v === 'string') {
              date = new Date(cell.v);
            }
          }
          
          if (!date && cell.f) {
            const dateMatch = cell.f.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
            if (dateMatch) {
              const [, month, day, year, hours, minutes, seconds] = dateMatch;
              date = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hours),
                parseInt(minutes),
                parseInt(seconds)
              );
            } else {
              date = new Date(cell.f);
            }
          }
          
          if (date && !isNaN(date.getTime())) {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const year = date.getFullYear();
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();
            value = `${month}/${day}/${year} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else if (cell.f) {
            value = cell.f;
          }
        } else if (cell.f) {
          value = cell.f;
        } else if (cell.v !== null && cell.v !== undefined) {
          value = String(cell.v);
        }
      }
      
      rowData[header] = value;
    });
    return rowData;
    });
    
    return { data };
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      // CORS error - Google Sheets API อาจจะถูก block
      // ลองใช้วิธีอื่น: ใช้ JSONP หรือ proxy
      throw new Error('Failed to fetch: ไม่สามารถเชื่อมต่อกับ Google Sheets ได้\n\nสาเหตุที่เป็นไปได้:\n1. Google Sheet ต้องถูก share เป็น "Anyone with the link can view"\n2. CORS policy block การเข้าถึงจาก domain นี้\n3. Network connection มีปัญหา\n\nวิธีแก้ไข:\n1. ตรวจสอบว่า Google Sheet ถูก share เป็น "Anyone with the link can view"\n2. เปิด Developer Console (F12) เพื่อดู error message เพิ่มเติม\n3. ลองใช้ CORS proxy หรือ JSONP');
    }
    throw error;
  }
}

// Update sheet data via Google Apps Script
export async function updateSheetData(
  sheetType: 'sheets' | 'sheets2' | 'sheets3',
  rowIndex: number,
  columnName: string,
  value: string
) {
  const config = SHEET_CONFIGS[sheetType];
  const appsScriptUrl = getAppsScriptUrl();
  
  console.log('Updating sheet via Apps Script:', {
    url: appsScriptUrl,
    sheetType,
    rowIndex: rowIndex + 2,
    columnName,
    value,
    sheetId: config.SHEET_ID,
    gid: config.GID
  });

  try {
    // ใช้ GET request แทน POST เพื่อหลีกเลี่ยง CORS preflight
    // ส่งข้อมูลผ่าน query parameters
    const params = new URLSearchParams({
      action: 'update',
      rowIndex: String(rowIndex + 2), // +2 because row 1 = header, row 2 = first data row
      columnName: columnName,
      value: value,
      sheetId: config.SHEET_ID,
      gid: config.GID,
    });
    
    const urlWithParams = `${appsScriptUrl}?${params.toString()}`;
    const response = await fetch(urlWithParams, {
      method: 'GET',
      // ไม่ใช้ no-cors เพื่อให้อ่าน response ได้
      // Google Apps Script จะต้องจัดการ CORS
    });

    console.log('Apps Script response status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('Apps Script response text (first 500 chars):', responseText.substring(0, 500));
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Apps Script returned non-JSON response. Full response:', responseText);
      throw new Error(`Apps Script returned invalid response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
    }

    // Google Apps Script อาจ return 200 OK แม้ว่าจะมี error
    if (!result || result.success === false) {
      const errorMsg = result?.error || `Apps Script error: ${response.statusText}`;
      console.error('Apps Script returned error:', errorMsg, result);
      throw new Error(errorMsg);
    }

    console.log('Apps Script update successful:', result);
    return result;
  } catch (error) {
    console.error('Error calling Apps Script:', error);
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Failed to fetch: ไม่สามารถเชื่อมต่อกับ Google Apps Script ได้ กรุณาตรวจสอบ: 1) Google Apps Script ถูก deploy แล้ว 2) Web App ตั้งค่า "Anyone" access 3) ตรวจสอบ network connection');
    }
    throw error;
  }
}

// Delete sheet row via Google Apps Script
export async function deleteSheetRow(
  sheetType: 'sheets' | 'sheets2' | 'sheets3',
  rowIndex: number
) {
  const config = SHEET_CONFIGS[sheetType];
  const appsScriptUrl = getAppsScriptUrl();
  
  console.log('Deleting row via Apps Script:', {
    url: appsScriptUrl,
    sheetType,
    rowIndex: rowIndex + 2,
    sheetId: config.SHEET_ID,
    gid: config.GID
  });

  try {
    // ใช้ GET request แทน POST เพื่อหลีกเลี่ยง CORS preflight
    // ส่งข้อมูลผ่าน query parameters
    const params = new URLSearchParams({
      action: 'delete',
      rowIndex: String(rowIndex + 2), // +2 because row 1 = header, row 2 = first data row
      sheetId: config.SHEET_ID,
      gid: config.GID,
    });
    
    const urlWithParams = `${appsScriptUrl}?${params.toString()}`;
    const response = await fetch(urlWithParams, {
      method: 'GET',
      // ไม่ใช้ no-cors เพื่อให้อ่าน response ได้
      // Google Apps Script จะต้องจัดการ CORS
    });

    console.log('Apps Script response status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('Apps Script response text (first 500 chars):', responseText.substring(0, 500));
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Apps Script returned non-JSON response. Full response:', responseText);
      throw new Error(`Apps Script returned invalid response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok || !result.success) {
      const errorMsg = result?.error || `Apps Script error: ${response.statusText}`;
      console.error('Apps Script error:', errorMsg, result);
      throw new Error(errorMsg);
    }

    console.log('Apps Script delete successful:', result);
    return result;
  } catch (error) {
    console.error('Error calling Apps Script:', error);
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Failed to fetch: ไม่สามารถเชื่อมต่อกับ Google Apps Script ได้ กรุณาตรวจสอบ: 1) Google Apps Script ถูก deploy แล้ว 2) Web App ตั้งค่า "Anyone" access 3) ตรวจสอบ network connection');
    }
    throw error;
  }
}

// Extract multiple Google Drive links from text
export function extractDriveLinks(text: string): string[] {
  const urlPattern = /https?:\/\/drive\.google\.com\/[^\s]+/g;
  const matches = text.match(urlPattern);
  return matches || [];
}

// Convert Google Drive link to direct image URL
export function convertDriveLinkToImageUrl(driveUrl: string): string | null {
  try {
    const match = driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      // Use direct Google Drive image URL
      // For public files: https://drive.google.com/uc?export=view&id=FILE_ID
      // For private files, you may need to use thumbnail: https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return null;
  } catch {
    return null;
  }
}
