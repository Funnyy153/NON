import { NextResponse } from 'next/server';

// Sheet ID และ GID จาก URL
const SHEET_ID = '1vctOoJm4pLcbNfh6PRPNAQI3pW_GKPw3Sy3eoMqBh38';
const GID = '44722663';

export async function POST(request: Request) {
  try {
    const { rowIndex } = await request.json();
    
    if (rowIndex === undefined) {
      return NextResponse.json(
        { error: 'rowIndex is required' },
        { status: 400 }
      );
    }

    // ใช้ Google Apps Script Web App
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    
    // Debug: log environment variable
    console.log('Environment check:');
    console.log('  GOOGLE_APPS_SCRIPT_URL:', appsScriptUrl || 'NOT SET');
    
    // Fallback: ถ้าไม่มี env variable หรือเป็น /dev URL ให้ใช้ hardcoded production URL
    const productionUrl = 'https://script.google.com/macros/s/AKfycbzCxRXVyHg1YDQUWsFI_EbQEdQH6kZzR8QDKtrV00zDxoJhioOVyxYgFlrw5DeutgfSoA/exec';
    const finalAppsScriptUrl = (appsScriptUrl && !appsScriptUrl.includes('/dev')) 
      ? appsScriptUrl 
      : productionUrl;
    
    console.log('Using Apps Script URL:', finalAppsScriptUrl);
    
    try {
      console.log('Calling Apps Script URL to delete row:', finalAppsScriptUrl);
      const response = await fetch(finalAppsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          rowIndex: rowIndex + 2, // +2 เพราะ row 1 = header, row 2 = แถวแรกของข้อมูล
        }),
      });

      // Google Apps Script อาจ return HTML error page แทน JSON
      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // ถ้า parse ไม่ได้ แสดงว่าเป็น HTML error page
        console.error('Apps Script returned non-JSON response:', responseText.substring(0, 500));
        throw new Error(`Apps Script returned invalid response. Status: ${response.status}. Make sure the script is deployed correctly.`);
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Apps Script error: ${response.statusText}`);
      }

      console.log('Row deleted via Apps Script:', result);
      
      return NextResponse.json({ 
        success: true,
        method: 'apps-script',
        result: result
      });
    } catch (appsScriptError: any) {
      console.error('Google Apps Script error:', appsScriptError);
      return NextResponse.json(
        { 
          error: 'Failed to delete row via Apps Script',
          details: appsScriptError.message
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('Error deleting row:', error);
    return NextResponse.json(
      { error: 'Failed to delete row', details: error.message },
      { status: 500 }
    );
  }
}

