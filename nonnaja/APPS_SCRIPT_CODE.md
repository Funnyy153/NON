# Google Apps Script Code สำหรับอัปเดตและลบแถว

## โค้ดที่ต้องใช้ใน Google Apps Script

```javascript
// Function สำหรับ POST request (ใช้จาก API)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'update') {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
```

## ขั้นตอนการตั้งค่า

1. เปิด Google Sheet
2. ไปที่ **Extensions** > **Apps Script**
3. วางโค้ดด้านบนทั้งหมด
4. **Save** (Ctrl+S)
5. **Deploy** > **New deployment** หรือ **Manage deployments** > **Edit** > **New version**
6. เลือก **Web app**
7. ตั้งค่า:
   - **Execute as**: "Me"
   - **Who has access**: **"Anyone"** (สำคัญมาก!)
8. คลิก **Deploy**
9. คัดลอก Web App URL

## ทดสอบ

เปิด URL ในเบราว์เซอร์ (GET request):
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

ควรเห็น:
```json
{
  "success": true,
  "message": "Google Apps Script is working!",
  "note": "Use POST request to update sheet data"
}
```

## Troubleshooting

### Error: "Column not found"
- ตรวจสอบว่ามีคอลัมน์ "สถานะ" ใน Sheet หรือไม่
- ชื่อคอลัมน์ต้องตรงกับที่ส่งมา

### Error: "Unknown action"
- ตรวจสอบว่า Apps Script มี action 'update' และ 'delete' อยู่
- Deploy ใหม่หลังจากแก้ไขโค้ด

### Error: "Script function not found: doPost"
- ตรวจสอบว่ามี function `doPost` อยู่
- Deploy ใหม่

### Error: "Authorization required"
- ตั้งค่า Web App access เป็น "Anyone"
- Deploy ใหม่

