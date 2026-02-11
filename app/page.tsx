"use client";

import { useState, useMemo } from "react";
import { searchMembers, getSubdistricts, getMemberTypes, getAmphoes } from "./data/memberSearch";
import type { Member } from "./data/members";
import Navbar from "./components/Navbar2";

export default function Home() {
  // Form state - สำหรับ input และ dropdown (เปลี่ยนได้ตลอดเวลา)
  const [searchQuery, setSearchQuery] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [villageName, setVillageName] = useState("");
  const [soiRoad, setSoiRoad] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedAmphoe, setSelectedAmphoe] = useState("");
  const [selectedMemberType, setSelectedMemberType] = useState("");
  
  // Active search state - สำหรับการค้นหาจริง (เปลี่ยนเฉพาะเมื่อกดปุ่มค้นหา)
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [activeHouseNumber, setActiveHouseNumber] = useState("");
  const [activeVillageName, setActiveVillageName] = useState("");
  const [activeSoiRoad, setActiveSoiRoad] = useState("");
  const [activeDistrict, setActiveDistrict] = useState("");
  const [activeAmphoe, setActiveAmphoe] = useState("");
  const [activeMemberType, setActiveMemberType] = useState("");
  const [showResults, setShowResults] = useState(false);

  const subdistricts = useMemo(() => getSubdistricts(), []);
  const amphoes = useMemo(() => getAmphoes(), []);
  const memberTypes = useMemo(() => getMemberTypes(), []);

  // ค้นหาสมาชิก - ใช้ active states เท่านั้น
  const searchResults = useMemo(() => {
    let results = searchMembers(activeSearchQuery);

    // กรองตามบ้านเลขที่
    if (activeHouseNumber) {
      const searchTerm = activeHouseNumber.toLowerCase().trim();
      results = results.filter((member) => 
        member.houseNumber.toLowerCase().includes(searchTerm)
      );
    }

    // กรองตามหมู่บ้าน
    if (activeVillageName) {
      const searchTerm = activeVillageName.toLowerCase().trim();
      results = results.filter((member) => 
        member.villageName.toLowerCase().includes(searchTerm)
      );
    }

    // กรองตามถนน/ซอย
    if (activeSoiRoad) {
      const searchTerm = activeSoiRoad.toLowerCase().trim();
      results = results.filter((member) => 
        member.soi.toLowerCase().includes(searchTerm) ||
        member.road.toLowerCase().includes(searchTerm)
      );
    }

    // กรองตามตำบล (subdistrict)
    if (activeDistrict) {
      results = results.filter((member) => member.subdistrict === activeDistrict);
    }

    // กรองตามอำเภอ (district)
    if (activeAmphoe) {
      results = results.filter((member) => member.district === activeAmphoe);
    }

    // กรองตามประเภทสมาชิก
    if (activeMemberType) {
      results = results.filter((member) => member.memberType === activeMemberType);
    }

    return results;
  }, [activeSearchQuery, activeHouseNumber, activeVillageName, activeSoiRoad, activeDistrict, activeAmphoe, activeMemberType]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    // อัพเดท active states จาก form states เมื่อกดปุ่มค้นหา
    setActiveSearchQuery(searchQuery);
    setActiveHouseNumber(houseNumber);
    setActiveVillageName(villageName);
    setActiveSoiRoad(soiRoad);
    setActiveDistrict(selectedDistrict);
    setActiveAmphoe(selectedAmphoe);
    setActiveMemberType(selectedMemberType);
    setShowResults(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };


  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-orange-900 mb-2">
            ค้นหาสมาชิก
          </h1>
          <p className="text-orange-700 text-sm sm:text-base">
            ค้นหาจากเลขสมาชิก, ชื่อ, นามสกุล, เบอร์โทรศัพท์, ตำบล, บ้านเลขที่, หมู่, หมู่บ้าน, ซอย, หรือถนน
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-orange-200 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <label className="block text-sm font-semibold text-orange-800 mb-2">
                ค้นหา
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyPress={handleKeyPress}
                  placeholder="พิมพ์เลขสมาชิก, ชื่อ, นามสกุล, เบอร์โทร, ตำบล, บ้านเลขที่, หมู่, หมู่บ้าน, ซอย, หรือถนน..."
                  className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base text-left"
                />
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Address Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* House Number */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  บ้านเลขที่
                </label>
                <input
                  type="text"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="เช่น 111, 69/78"
                  className="w-full px-4 py-3 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base text-left"
                />
              </div>

              {/* Village Name */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  หมู่บ้าน
                </label>
                <input
                  type="text"
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  placeholder="เช่น ศุภาลัยพรีโม่"
                  className="w-full px-4 py-3 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base text-left"
                />
              </div>

              {/* Soi/Road */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  ถนน/ซอย
                </label>
                <input
                  type="text"
                  value={soiRoad}
                  onChange={(e) => setSoiRoad(e.target.value)}
                  placeholder="เช่น รัตนาธิเบศร์, ซอย 5"
                  className="w-full px-4 py-3 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base text-left"
                />
              </div>

              {/* District Filter */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  ตำบล
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base appearance-none bg-white"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23ea580c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                >
                  <option value="">ทั้งหมด</option>
                  {subdistricts.map((subdistrict) => (
                    <option key={subdistrict} value={subdistrict}>
                      {subdistrict}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amphoe Filter */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  อำเภอ
                </label>
                <select
                  value={selectedAmphoe}
                  onChange={(e) => setSelectedAmphoe(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base appearance-none bg-white"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23ea580c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                >
                  <option value="">ทั้งหมด</option>
                  {amphoes.map((amphoe) => (
                    <option key={amphoe} value={amphoe}>
                      {amphoe}
                    </option>
                  ))}
                </select>
              </div>

              {/* Member Type Filter */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  ประเภทสมาชิก
                </label>
                <select
                  value={selectedMemberType}
                  onChange={(e) => setSelectedMemberType(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base appearance-none bg-white"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23ea580c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                >
                  <option value="">ทั้งหมด</option>
                  {memberTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Button */}
            <div className="pt-2">
              <button
                type="submit"
                onClick={handleSearch}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-500/50"
              >
                ค้นหา
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {showResults && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-orange-200 overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-orange-900">
                  ผลการค้นหา
                </h2>
                <span className="text-sm text-orange-700">
                  พบ {searchResults.length} รายการ
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-orange-600">
                  <p>ไม่พบข้อมูลที่ค้นหา</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {searchResults.map((member) => (
                    <div
                      key={member.memberId}
                      className="p-4 rounded-lg border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all duration-200"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                        <div>
                          <span className="text-xs text-orange-600 font-semibold">
                            เลขสมาชิก:
                          </span>
                          <p className="text-sm sm:text-base font-medium text-gray-800">
                            {member.memberId}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-orange-600 font-semibold">
                            ชื่อ-นามสกุล:
                          </span>
                          <p className="text-sm sm:text-base font-medium text-gray-800">
                            {member.firstName} {member.lastName}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-orange-600 font-semibold">
                            ประเภท:
                          </span>
                          <p className="text-sm sm:text-base text-gray-800">
                            {member.memberType}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-orange-600 font-semibold">
                            เบอร์โทร:
                          </span>
                          {member.phone ? (
                            <a
                              href={`tel:${member.phone.replace(/-/g, '')}`}
                              className="text-sm sm:text-base text-blue-600 hover:text-blue-800 hover:underline font-medium block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {member.phone}
                            </a>
                          ) : (
                            <p className="text-sm sm:text-base text-gray-800">-</p>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-orange-600 font-semibold">
                            อำเภอ:
                          </span>
                          <p className="text-sm sm:text-base text-gray-800">
                            {member.district || "-"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-orange-600 font-semibold">
                            ตำบล:
                          </span>
                          <p className="text-sm sm:text-base text-gray-800">
                            {member.subdistrict || "-"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Address Information */}
                      {(member.houseNumber || member.village || member.villageName || member.soi || member.road) && (
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                            {member.houseNumber && (
                              <div>
                                <span className="text-xs text-orange-600 font-semibold">
                                  บ้านเลขที่:
                                </span>
                                <p className="text-sm sm:text-base text-gray-800">
                                  {member.houseNumber}
                                </p>
                              </div>
                            )}
                            {member.village && (
                              <div>
                                <span className="text-xs text-orange-600 font-semibold">
                                  หมู่:
                                </span>
                                <p className="text-sm sm:text-base text-gray-800">
                                  {member.village}
                                </p>
                              </div>
                            )}
                            {member.villageName && (
                              <div>
                                <span className="text-xs text-orange-600 font-semibold">
                                  หมู่บ้าน:
                                </span>
                                <p className="text-sm sm:text-base text-gray-800">
                                  {member.villageName}
                                </p>
                              </div>
                            )}
                            {member.soi && (
                              <div>
                                <span className="text-xs text-orange-600 font-semibold">
                                  ซอย:
                                </span>
                                <p className="text-sm sm:text-base text-gray-800">
                                  {member.soi}
                                </p>
                              </div>
                            )}
                            {member.road && (
                              <div>
                                <span className="text-xs text-orange-600 font-semibold">
                                  ถนน:
                                </span>
                                <p className="text-sm sm:text-base text-gray-800">
                                  {member.road}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
