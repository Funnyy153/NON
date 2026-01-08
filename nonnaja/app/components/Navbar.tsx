"use client";

import { usePathname, useRouter } from "next/navigation";

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
    </nav>
  );
}
