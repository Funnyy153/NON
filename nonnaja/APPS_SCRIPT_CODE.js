// Function สำหรับ POST request (ใช้จาก API)
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
        h && (h.includes(columnName) || columnName.includes(h))
      );
      
      if (columnIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Column not found: ' + columnName
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // อัปเดตค่า (columnIndex + 1 เพราะ getRange ใช้ 1-based index)
      sheet.getRange(rowIndex, columnIndex + 1).setValue(value);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        row: rowIndex,
        column: columnIndex + 1,
        value: value
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'delete') {
      const rowIndex = data.rowIndex; // แถวใน Sheet (1-based, รวม header)
      
      // ตรวจสอบว่า rowIndex ถูกต้อง (ต้องมากกว่า 1 เพราะ row 1 คือ header)
      if (rowIndex <= 1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Cannot delete header row'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // ลบแถว
      sheet.deleteRow(rowIndex);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        deletedRow: rowIndex
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown action: ' + action
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Function สำหรับ GET request (สำหรับทดสอบ)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Google Apps Script is working!',
    note: 'Use POST request to update sheet data'
  })).setMimeType(ContentService.MimeType.JSON);
}

