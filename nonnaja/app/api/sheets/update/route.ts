import { NextResponse } from 'next/server';

// Sheet ID และ GID จาก URL
const SHEET_ID = '1vctOoJm4pLcbNfh6PRPNAQI3pW_GKPw3Sy3eoMqBh38';
const GID = '44722663';

export async function POST(request: Request) {
  try {
    const { rowIndex, value, columnName } = await request.json();
    
    if (rowIndex === undefined || value === undefined || !columnName) {
      return NextResponse.json(
        { error: 'rowIndex, value, and columnName are required' },
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
      console.log('Calling Apps Script URL to update:', finalAppsScriptUrl);
      const response = await fetch(finalAppsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          rowIndex: rowIndex + 2, // +2 เพราะ row 1 = header, row 2 = แถวแรกของข้อมูล
          columnName: columnName,
          value: value,
        }),
      });

      // Google Apps Script อาจ return HTML error page แทน JSON
      const responseText = await response.text();
      console.log('Apps Script response status:', response.status);
      console.log('Apps Script response text (first 1000 chars):', responseText.substring(0, 1000));
      
      let result;
      
      try {
        result = JSON.parse(responseText);
        console.log('Parsed Apps Script result:', result);
      } catch (parseError) {
        // ถ้า parse ไม่ได้ แสดงว่าเป็น HTML error page
        console.error('Apps Script returned non-JSON response. Full response:', responseText);
        throw new Error(`Apps Script returned invalid response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }

      // Google Apps Script อาจ return 200 OK แม้ว่าจะมี error
      if (!result || result.success === false) {
        console.error('Apps Script returned error:', result);
        throw new Error(result?.error || `Apps Script error: ${response.statusText}`);
      }

      // ถ้า response.ok เป็น false แต่ result.success เป็น true (ไม่น่าจะเกิด)
      if (!response.ok && result.success !== true) {
        console.error('Apps Script HTTP error:', response.status, result);
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('Sheet updated via Apps Script successfully:', result);
      
      return NextResponse.json({ 
        success: true,
        method: 'apps-script',
        result: result
      });
    } catch (appsScriptError: any) {
      console.error('Google Apps Script error:', appsScriptError);
      console.error('Error details:', {
        message: appsScriptError.message,
        stack: appsScriptError.stack
      });
      return NextResponse.json(
        { 
          error: 'Failed to update via Apps Script',
          details: appsScriptError.message || 'Unknown error',
          suggestion: 'Please check: 1) Google Apps Script is deployed, 2) Web App access is set to "Anyone", 3) Check Apps Script execution logs'
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('Error updating Google Sheet:', error);
    return NextResponse.json(
      { error: 'Failed to update Google Sheet', details: error.message },
      { status: 500 }
    );
  }
}

