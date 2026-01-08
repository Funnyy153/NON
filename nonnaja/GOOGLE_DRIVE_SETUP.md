# วิธีตั้งค่า Google Drive สำหรับแสดงรูปภาพ

## ปัญหา
Google Drive files เป็น private จึงไม่สามารถเข้าถึงรูปภาพได้โดยตรง

## วิธีแก้ไข (เลือกวิธีใดวิธีหนึ่ง)

### วิธีที่ 1: Share files เป็น "Anyone with the link" (แนะนำ - ง่ายที่สุด)

1. ไปที่ Google Drive
2. คลิกขวาที่ไฟล์รูปภาพ
3. เลือก "Share" (แชร์)
4. เปลี่ยนการตั้งค่าเป็น **"Anyone with the link"** (ทุกคนที่มีลิงก์)
5. คัดลอกลิงก์และวางใน Google Sheets

**ข้อดี:** ไม่ต้องตั้งค่า API credentials  
**ข้อเสีย:** ไฟล์จะเข้าถึงได้โดยทุกคนที่มีลิงก์

---

### วิธีที่ 2: ใช้ Google Drive API (สำหรับ private files)

ถ้าต้องการให้ไฟล์เป็น private และใช้ API:

1. สร้าง Google Cloud Project:
   - ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
   - สร้างโปรเจกต์ใหม่

2. เปิดใช้งาน Google Drive API:
   - ไปที่ "APIs & Services" > "Library"
   - ค้นหา "Google Drive API"
   - คลิก "Enable"

3. สร้าง Service Account:
   - ไปที่ "APIs & Services" > "Credentials"
   - คลิก "Create Credentials" > "Service Account"
   - ตั้งชื่อและสร้าง

4. ดาวน์โหลด JSON key:
   - คลิกที่ Service Account ที่สร้าง
   - ไปที่ "Keys" tab
   - คลิก "Add Key" > "Create new key"
   - เลือก JSON และดาวน์โหลด

5. Share files กับ Service Account:
   - เปิดไฟล์ JSON ที่ดาวน์โหลดมา
   - คัดลอก email จาก field `client_email` (รูปแบบ: xxx@xxx.iam.gserviceaccount.com)
   - ไปที่ Google Drive
   - คลิกขวาที่ไฟล์รูปภาพ > "Share"
   - วาง email ของ Service Account และให้สิทธิ์ "Viewer"

6. ตั้งค่า Environment Variable:
   - สร้างไฟล์ `.env.local` ในโฟลเดอร์ `nonnaja`
   - เพิ่ม:
     ```
     GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY=path/to/your/service-account-key.json
     ```
   - หรือถ้าใช้ Vercel/Netlify ให้เพิ่มใน Environment Variables

---

## การทดสอบ

หลังจากตั้งค่าแล้ว:
1. รัน `npm run dev`
2. เปิด `/pages/before`
3. ตรวจสอบว่ารูปภาพแสดงขึ้นมาหรือไม่

---

## Troubleshooting

### รูปภาพไม่แสดง
- ตรวจสอบว่าไฟล์ share เป็น "Anyone with the link" หรือไม่
- ตรวจสอบว่า Service Account email ได้รับสิทธิ์เข้าถึงไฟล์หรือไม่
- ตรวจสอบ console ใน browser สำหรับ error messages

### API Error
- ตรวจสอบว่า Google Drive API เปิดใช้งานแล้ว
- ตรวจสอบว่า Service Account key ถูกต้อง
- ตรวจสอบว่าไฟล์ share กับ Service Account แล้ว

