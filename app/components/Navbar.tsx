"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: "รายงานก่อนเปิดหีบ", path: "/pages/before" },
    { label: "รายงานหลังปิดหีบ", path: "/pages/after" },
    { label: "Incident Alert", path: "/pages/alert" },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMenuOpen(false); // ปิด menu หลังจาก navigate
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 w-full py-3 sm:py-5 md:py-6 px-4 sm:px-6 shadow-md z-50"
      style={{ backgroundColor: "#FF6A13" }}
    >
      <div className="flex items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex-shrink-0">
            <Image
              src="/nonmon.jpg"
              alt="Logo"
              width={80}
              height={80}
              className="rounded-full w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 object-cover"
            />
          </div>
          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-wrap gap-3 sm:gap-4">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg font-semibold text-sm sm:text-base md:text-lg lg:text-xl transition-all duration-200 ${
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
        
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-white p-2 focus:outline-none"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-white/20">
          <div className="flex flex-col gap-2 mt-4">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`px-4 py-3 rounded-lg font-semibold text-base text-left transition-all duration-200 ${
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
      )}
    </nav>
  );
}
