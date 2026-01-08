import { NextResponse } from 'next/server';

// Sheet ID และ GID จาก URL ที่คุณให้มา
const SHEET_ID = '1vctOoJm4pLcbNfh6PRPNAQI3pW_GKPw3Sy3eoMqBh38';
const GID = '44722663';

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
    const jsonMatch = jsonText.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
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
        // ดึงค่าจาก cell.v (value) หรือ cell.f (formatted value) ถ้าไม่มี
        const value = cell ? (cell.v !== null && cell.v !== undefined ? String(cell.v) : (cell.f || '')) : '';
        rowData[header] = value;
      });
      return rowData;
    });
    
    // ไม่กรองแถวใดๆ ออก ให้แสดงทุกแถว (รวมแถวที่ว่างเปล่าด้วย)
    // แต่ถ้าต้องการกรองแถวที่ว่างเปล่าทั้งหมดจริงๆ ให้ใช้โค้ดด้านล่าง
    // .filter((row: Record<string, string>) => {
    //   return Object.values(row).some(val => String(val).trim() !== '');
    // });
    
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

