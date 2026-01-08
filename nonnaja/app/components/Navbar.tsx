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
      className="w-full py-4 px-4 sm:px-6 shadow-md"
      style={{ backgroundColor: "#FF6A13" }}
    >
      <div className="flex flex-wrap gap-2 sm:gap-4">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
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
