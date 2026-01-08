import { NextResponse } from 'next/server';

// Sheet ID และ GID จาก URL สำหรับหน้า after
const SHEET_ID = '1wl4cnLPCunVzzzzm6RsxOXsaJC3fS-Fu-7ZKrCCks3A';
const GID = '598449528';

export async function GET() {
  try {
    // ใช้ JSON format แทน CSV เพื่อให้ได้ข้อมูลครบถ้วนกว่า
    const jsonUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;
    
    const response = await fetch(jsonUrl, {
      cache: 'no-store', // ไม่ cache เพื่อให้ได้ข้อมูลล่าสุด
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const jsonText = await response.text();
    
    // Google Sheets JSON format มี prefix "google.visualization.Query.setResponse(" และ suffix ");"
    // ต้องตัดออกก่อน
    // ใช้ [\s\S] แทน . เพื่อ match ทุก character รวมถึง newline (แทน flag s)
    const jsonMatch = jsonText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Google Sheets');
    }
    
    const jsonData = JSON.parse(jsonMatch[1]);
    
    // แปลงข้อมูลจาก Google Sheets format เป็น array of objects
    if (!jsonData.table || !jsonData.table.rows) {
      return NextResponse.json({ data: [] });
    }
    
    const headers = jsonData.table.cols.map((col: any) => col.label || '');
    const rows = jsonData.table.rows;
    
    const data = rows.map((row: any) => {
      const rowData: Record<string, string> = {};
      headers.forEach((header: string, index: number) => {
        const cell = row.c[index];
        let value = '';
        
        if (cell) {
          // ถ้าเป็น Timestamp column
          if (header.toLowerCase().includes('timestamp')) {
            let date: Date | null = null;
            
            // ลองแปลงจาก cell.v (raw value)
            if (cell.v !== null && cell.v !== undefined) {
              if (cell.v instanceof Date) {
                date = cell.v;
              } else if (typeof cell.v === 'object' && 'getTime' in cell.v) {
                date = new Date(cell.v);
              } else if (typeof cell.v === 'number') {
                // Google Sheets date serial number (days since 1900-01-01)
                // Excel/Sheets date serial: 1 = 1900-01-01, แต่ JavaScript Date ใช้ 1970-01-01
                // ดังนั้นต้องแปลง: (cell.v - 25569) * 86400 * 1000
                // 25569 = days between 1900-01-01 and 1970-01-01
                date = new Date((cell.v - 25569) * 86400 * 1000);
              } else if (typeof cell.v === 'string') {
                date = new Date(cell.v);
              }
            }
            
            // ถ้ายังไม่มี date และมี cell.f ลอง parse จาก formatted value
            if (!date && cell.f) {
              // ลอง parse จาก formatted string เช่น "1/7/2026 18:39:45"
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
                // ลอง parse เป็น Date ทั่วไป
                date = new Date(cell.f);
              }
            }
            
            // แปลง Date เป็นรูปแบบ M/D/YYYY HH:mm:ss
            if (date && !isNaN(date.getTime())) {
              const month = date.getMonth() + 1;
              const day = date.getDate();
              const year = date.getFullYear();
              const hours = date.getHours();
              const minutes = date.getMinutes();
              const seconds = date.getSeconds();
              value = `${month}/${day}/${year} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else if (cell.f) {
              // ถ้า parse ไม่ได้ ใช้ formatted value ตามเดิม
              value = cell.f;
            }
          } else if (cell.f) {
            // สำหรับคอลัมน์อื่น ใช้ formatted value ถ้ามี
            value = cell.f;
          } else if (cell.v !== null && cell.v !== undefined) {
            // ใช้ raw value
            value = String(cell.v);
          }
        }
        
        rowData[header] = value;
      });
      return rowData;
    });
    
    console.log(`Found ${rows.length} rows, ${headers.length} columns`);
    console.log(`Headers:`, headers);
    console.log(`Data rows:`, data.length);
    
    return NextResponse.json({ 
      data, 
      debug: { 
        totalRows: rows.length, 
        headers: headers.length, 
        dataRows: data.length 
      } 
    });
  } catch (error) {
    console.error('Error fetching Google Sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Google Sheet' },
      { status: 500 }
    );
  }
}

