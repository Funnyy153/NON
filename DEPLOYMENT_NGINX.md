# แก้ไขปัญหา 403 Forbidden และ Trailing Slash

## ปัญหา
เมื่อ refresh หน้าเว็บ URL เปลี่ยนจาก `/pages/before` เป็น `/pages/before/` และเกิด 403 Forbidden error

## สาเหตุ
Next.js static export สร้างไฟล์เป็น `before.html` ไม่ใช่ `before/index.html` ทำให้เมื่อ nginx redirect ไปที่ `/pages/before/` ไม่พบไฟล์

## วิธีแก้ไข

### สำหรับ Nginx Server

1. **อัปโหลดไฟล์ `nginx.conf`** ไปยัง server และแก้ไข path:
   ```nginx
   root /path/to/your/out/folder;  # เปลี่ยนเป็น path จริง
   ```

2. **หรือเพิ่ม configuration ใน nginx site config:**
   ```nginx
   location / {
       try_files $uri $uri.html $uri/ =404;
   }
   
   # Handle pages routes without trailing slash
   location ~ ^/pages/([^/]+)$ {
       try_files $uri $uri.html /pages/$1.html =404;
   }
   
   # Handle pages routes with trailing slash - redirect to without slash
   location ~ ^/pages/([^/]+)/$ {
       return 301 /pages/$1;
   }
   ```

3. **Reload nginx:**
   ```bash
   sudo nginx -t  # ตรวจสอบ configuration
   sudo systemctl reload nginx  # หรือ sudo service nginx reload
   ```

### สำหรับ Apache Server

1. **อัปโหลดไฟล์ `.htaccess`** ไปยัง root ของ `out` folder

2. **ตรวจสอบว่า Apache มี mod_rewrite เปิดอยู่:**
   ```bash
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```

3. **ตรวจสอบว่า Apache อนุญาตให้ใช้ .htaccess:**
   - ตรวจสอบใน Apache config: `AllowOverride All`

### วิธีทดสอบ

1. เปิด URL: `https://teamchet-election69.ai-dear-d.com/pages/before`
2. Refresh หน้าเว็บ (F5)
3. ตรวจสอบว่า URL ยังคงเป็น `/pages/before` (ไม่มี trailing slash)
4. ตรวจสอบว่าไม่เกิด 403 error

### หมายเหตุ

- ถ้าใช้ hosting service (เช่น cPanel) อาจต้องใช้ `.htaccess` แทน nginx config
- บาง hosting service อาจมี interface สำหรับจัดการ rewrite rules
- ตรวจสอบว่าไฟล์ `.htaccess` ถูก upload ไปยัง root ของ `out` folder แล้ว
