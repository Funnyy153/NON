"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: "รายงานก่อนเปิดหีบ", path: "/pages/before" },
    { label: "รายงานหลังปิดหีบ", path: "/pages/after" },
    { label: "Incident Alert", path: "/pages/alert" },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 w-full py-5 sm:py-6 px-4 sm:px-6 shadow-md z-50"
      style={{ backgroundColor: "#FF6A13" }}
    >
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex-shrink-0">
          <Image
            src="/nonmon.jpg"
            alt="Logo"
            width={80}
            height={80}
            className="rounded-full w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-cover"
          />
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold text-base sm:text-lg md:text-xl transition-all duration-200 ${
                  isActive
                    ? "bg-white text-[#FF6A13] shadow-md"
                    : "bg-transparent text-white hover:bg-white/20"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
