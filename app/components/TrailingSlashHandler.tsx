'use client';

import { useEffect } from 'react';

export default function TrailingSlashHandler() {
  useEffect(() => {
    // ตรวจสอบ URL ใน browser (ไม่ใช่ pathname จาก Next.js)
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      
      // ตรวจสอบว่า URL มี trailing slash หรือไม่ (ยกเว้น root)
      if (currentPath !== '/' && currentPath.endsWith('/')) {
        // ลบ trailing slash และ redirect ทันที
        const newPath = currentPath.slice(0, -1);
        // ใช้ replace แทน push เพื่อไม่ให้เพิ่ม history entry
        window.history.replaceState(null, '', newPath);
        // Reload หน้าเว็บเพื่อให้ Next.js router ทำงานถูกต้อง
        window.location.href = newPath;
      }
    }
  }, []); // รันครั้งเดียวเมื่อ component mount

  return null; // Component นี้ไม่แสดงอะไร
}
