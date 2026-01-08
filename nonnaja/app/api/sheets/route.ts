import { NextResponse } from 'next/server';

// Sheet ID และ GID จาก URL ที่คุณให้มา
const SHEET_ID = '1vctOoJm4pLcbNfh6PRPNAQI3pW_GKPw3Sy3eoMqBh38';
const GID = '44722663';

export async function GET() {
  try {
    // ใช้ CSV export URL สำหรับ public sheet
    // หรือใช้ Google Sheets API สำหรับ private sheet
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;
    
    const response = await fetch(csvUrl, {
      cache: 'no-store', // ไม่ cache เพื่อให้ได้ข้อมูลล่าสุด
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const csvText = await response.text();
    
    // ฟังก์ชันสำหรับ parse CSV ที่ถูกต้อง
    function parseCSVLine(line: string): string[] {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      // Add last field
      values.push(current.trim());
      
      return values;
    }

    // แปลง CSV เป็น JSON
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // แยก header
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    
    // แปลงแต่ละแถวเป็น object
    const data = lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.replace(/^"|"$/g, '') || '';
      });
      return row;
    }).filter(row => {
      // กรองแถวที่ว่างเปล่า (ไม่มีข้อมูลเลย)
      return Object.values(row).some(val => val.trim() !== '');
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching Google Sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Google Sheet' },
      { status: 500 }
    );
  }
}

