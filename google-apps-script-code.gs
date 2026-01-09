// Google Apps Script สำหรับจัดการ Google Sheets
// รองรับทั้ง GET และ POST requests เพื่อหลีกเลี่ยง CORS issues

// Function สำหรับ GET request (ใช้ query parameters)
function doGet(e) {
  try {
    // อ่าน parameters จาก query string
    const action = e.parameter.action;
    const sheetId = e.parameter.sheetId;
    const gid = e.parameter.gid;
    
    // เลือก Spreadsheet
    let spreadsheet;
    if (sheetId) {
      spreadsheet = SpreadsheetApp.openById(sheetId);
    } else {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    // เลือก Sheet (tab)
    let sheet;
    if (gid) {
      const sheets = spreadsheet.getSheets();
      sheet = sheets.find(s => s.getSheetId().toString() === gid);
      if (!sheet) {
        sheet = spreadsheet.getActiveSheet();
      }
    } else {
      sheet = spreadsheet.getActiveSheet();
    }
    
    if (action === 'update') {
      const rowIndex = parseInt(e.parameter.rowIndex); // แถวใน Sheet (1-based, รวม header)
      const columnName = e.parameter.columnName;
      const value = e.parameter.value;
      
      // หา column index จาก header
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const columnIndex = headers.findIndex(h => 
        h && (h.toString().includes(columnName) || columnName.includes(h.toString()))
      );
      
      if (columnIndex === -1) {
        return createCorsResponse(JSON.stringify({
          success: false,
          error: 'Column not found: ' + columnName
        }));
      }
      
      // อัปเดตค่า (columnIndex + 1 เพราะ getRange ใช้ 1-based index)
      sheet.getRange(rowIndex, columnIndex + 1).setValue(value);
      
      return createCorsResponse(JSON.stringify({
        success: true,
        row: rowIndex,
        column: columnIndex + 1,
        value: value
      }));
    }
    
    if (action === 'delete') {
      const rowIndex = parseInt(e.parameter.rowIndex); // แถวใน Sheet (1-based, รวม header)
      
      // ตรวจสอบว่า rowIndex ถูกต้อง (ต้องมากกว่า 1 เพราะ row 1 คือ header)
      if (rowIndex <= 1) {
        return createCorsResponse(JSON.stringify({
          success: false,
          error: 'Cannot delete header row'
        }));
      }
      
      // ลบแถว
      sheet.deleteRow(rowIndex);
      
      return createCorsResponse(JSON.stringify({
        success: true,
        deletedRow: rowIndex
      }));
    }
    
    // ถ้าไม่มี action หรือ action ไม่รู้จัก
    return createCorsResponse(JSON.stringify({
      success: true,
      message: 'Google Apps Script is working!',
      note: 'Use action=update or action=delete with required parameters'
    }));
    
  } catch (error) {
    return createCorsResponse(JSON.stringify({
      success: false,
      error: error.toString()
    }));
  }
}

// Function สำหรับ POST request (ใช้ JSON body)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const sheetId = data.sheetId; // Sheet ID (ถ้ามี)
    const gid = data.gid; // GID (ถ้ามี)
    
    // เลือก Spreadsheet
    let spreadsheet;
    if (sheetId) {
      spreadsheet = SpreadsheetApp.openById(sheetId);
    } else {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    // เลือก Sheet (tab)
    let sheet;
    if (gid) {
      const sheets = spreadsheet.getSheets();
      sheet = sheets.find(s => s.getSheetId().toString() === gid);
      if (!sheet) {
        sheet = spreadsheet.getActiveSheet();
      }
    } else {
      sheet = spreadsheet.getActiveSheet();
    }
    
    if (action === 'update') {
      const rowIndex = data.rowIndex; // แถวใน Sheet (1-based, รวม header)
      const columnName = data.columnName;
      const value = data.value;
      
      // หา column index จาก header
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const columnIndex = headers.findIndex(h => 
        h && (h.toString().includes(columnName) || columnName.includes(h.toString()))
      );
      
      if (columnIndex === -1) {
        return createCorsResponse(JSON.stringify({
          success: false,
          error: 'Column not found: ' + columnName
        }));
      }
      
      // อัปเดตค่า (columnIndex + 1 เพราะ getRange ใช้ 1-based index)
      sheet.getRange(rowIndex, columnIndex + 1).setValue(value);
      
      return createCorsResponse(JSON.stringify({
        success: true,
        row: rowIndex,
        column: columnIndex + 1,
        value: value
      }));
    }
    
    if (action === 'delete') {
      const rowIndex = data.rowIndex; // แถวใน Sheet (1-based, รวม header)
      
      // ตรวจสอบว่า rowIndex ถูกต้อง (ต้องมากกว่า 1 เพราะ row 1 คือ header)
      if (rowIndex <= 1) {
        return createCorsResponse(JSON.stringify({
          success: false,
          error: 'Cannot delete header row'
        }));
      }
      
      // ลบแถว
      sheet.deleteRow(rowIndex);
      
      return createCorsResponse(JSON.stringify({
        success: true,
        deletedRow: rowIndex
      }));
    }
    
    return createCorsResponse(JSON.stringify({
      success: false,
      error: 'Unknown action: ' + action
    }));
    
  } catch (error) {
    return createCorsResponse(JSON.stringify({
      success: false,
      error: error.toString()
    }));
  }
}

// Function สำหรับจัดการ CORS headers
// หมายเหตุ: Google Apps Script ContentService ไม่สามารถตั้งค่า CORS headers ได้โดยตรง
// แต่ GET requests ไม่ต้องผ่าน CORS preflight ดังนั้นควรจะทำงานได้
function createCorsResponse(content) {
  return ContentService.createTextOutput(content)
    .setMimeType(ContentService.MimeType.JSON);
}

// Function สำหรับจัดการ OPTIONS request (CORS preflight)
function doOptions(e) {
  return createCorsResponse(JSON.stringify({
    success: true,
    message: 'CORS preflight OK'
  }));
}
