"use client";

import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  // กำหนดชื่อ navbar ตาม pathname
  const getNavbarTitle = () => {
    if (pathname === "/pages/before") {
      return "รายงานก่อนเปิดหีบ";
    } else if (pathname === "/pages/after") {
      return "รายงานหลังปิดหีบ";
    } else if (pathname === "/pages/alert") {
      return "Incident Alert";
    }
    return "";
  };

  const title = getNavbarTitle();

  // ถ้าไม่มี title ให้ไม่แสดง navbar
  if (!title) {
    return null;
  }

  return (
    <nav
      className="w-full py-4 pl-6 sm:pl-8 pr-4 sm:pr-6 shadow-md"
      style={{ backgroundColor: "#FF6A13" }}
    >
      <h1 className="text-xl sm:text-2xl font-bold text-white text-left">
        {title}
      </h1>
    </nav>
  );
}
