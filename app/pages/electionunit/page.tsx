"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Navbar from "../../components/Navbar2";
import { useElectionUnits, type ElectionUnit } from "../../data/electionUnits";

// Dynamic import with SSR disabled for Leaflet map component
const ElectionUnitMap = dynamic(
  () => import("../../components/ElectionUnitMap"),
  { ssr: false }
);

export default function ElectionUnitPage() {
  // Fetch election units from API
  const { units: electionUnits, loading, error } = useElectionUnits();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedElectionDistrict, setSelectedElectionDistrict] = useState("");
  const [selectedSubdistrict, setSelectedSubdistrict] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [selectedAmphoe, setSelectedAmphoe] = useState("");

  // Get unique values for dropdowns
  const districts = useMemo(() => {
    let filtered = electionUnits;
    
    if (selectedElectionDistrict) {
      filtered = filtered.filter(u => u.electionDistrict === selectedElectionDistrict);
    }
    
    // Get unique districts and filter out header names and invalid values
    const unique = Array.from(new Set(filtered.map(u => u.district).filter(Boolean)));
    
    // Filter out header names and invalid values
    const headerNames = [
      'หน่วยที่เลือกตั้งที่*',
      'ชื่อหน่วยเลือกตั้ง*',
      'สถานที่',
      'อำเภอ*',
      'อำเภอ',
      'ตำบล*',
      'ตำบล',
      'หมู่*',
      'หมู่',
      'พิกัด',
      'google,map*',
      'ผู้รับผิดชอบหน่วย*',
      'หมายเลขติดต่อ*'
    ];
    
    const validDistricts = unique.filter(d => {
      // Filter out header names
      if (headerNames.some(h => h.trim() === d.trim())) {
        return false;
      }
      // Filter out values that contain asterisk (likely header names)
      if (d.includes('*')) {
        return false;
      }
      return true;
    });
    
    return validDistricts.sort();
  }, [electionUnits, selectedElectionDistrict]);

  const subdistricts = useMemo(() => {
    let filtered = electionUnits;
    
    if (selectedElectionDistrict) {
      filtered = filtered.filter(u => u.electionDistrict === selectedElectionDistrict);
    }
    if (selectedAmphoe) {
      filtered = filtered.filter(u => u.district === selectedAmphoe);
    }
    
    // Get unique subdistricts and filter out header names and invalid values
    const unique = Array.from(new Set(filtered.map(u => u.subdistrict).filter(Boolean)));
    
    // Filter out header names and invalid values
    const headerNames = [
      'หน่วยที่เลือกตั้งที่*',
      'ชื่อหน่วยเลือกตั้ง*',
      'สถานที่',
      'อำเภอ*',
      'อำเภอ',
      'ตำบล*',
      'ตำบล',
      'หมู่*',
      'หมู่',
      'พิกัด',
      'google,map*',
      'ผู้รับผิดชอบหน่วย*',
      'หมายเลขติดต่อ*'
    ];
    
    const validSubdistricts = unique.filter(s => {
      // Filter out header names
      if (headerNames.some(h => h.trim() === s.trim())) {
        return false;
      }
      // Filter out values that contain asterisk (likely header names)
      if (s.includes('*')) {
        return false;
      }
      return true;
    });
    
    return validSubdistricts.sort();
  }, [electionUnits, selectedElectionDistrict, selectedAmphoe]);

  const villages = useMemo(() => {
    let filtered = electionUnits;
    
    if (selectedElectionDistrict) {
      filtered = filtered.filter(u => u.electionDistrict === selectedElectionDistrict);
    }
    if (selectedAmphoe) {
      filtered = filtered.filter(u => u.district === selectedAmphoe);
    }
    if (selectedSubdistrict) {
      filtered = filtered.filter(u => u.subdistrict === selectedSubdistrict);
    }
    
    // Get unique villages and filter out invalid values
    const unique = Array.from(new Set(filtered.map(u => u.village).filter(Boolean)));
    
    // Filter out values that look like unit numbers or invalid village numbers
    // Village numbers are typically 1-99, so filter out numbers > 50 that might be unit numbers
    const validVillages = unique.filter(v => {
      const num = parseInt(v);
      // If it's a number, check if it's a reasonable village number (1-50)
      // Numbers > 50 are likely unit numbers that were incorrectly read
      if (!isNaN(num)) {
        return num >= 1 && num <= 50;
      }
      // If it's not a number, keep it (might be text like "ไม่มี" or empty)
      return true;
    });
    
    return validVillages.sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }, [electionUnits, selectedElectionDistrict, selectedAmphoe, selectedSubdistrict]);

  // Filter units based on selections
  const filteredUnits = useMemo(() => {
    let filtered = electionUnits;

    // กรองตาม dropdowns
    if (selectedElectionDistrict) {
      filtered = filtered.filter(u => u.electionDistrict === selectedElectionDistrict);
    }
    if (selectedAmphoe) {
      filtered = filtered.filter(u => u.district === selectedAmphoe);
    }
    if (selectedSubdistrict) {
      filtered = filtered.filter(u => u.subdistrict === selectedSubdistrict);
    }
    if (selectedVillage) {
      filtered = filtered.filter(u => u.village === selectedVillage);
    }

    // ค้นหาจาก search query (unitNumber, unitName, location, district, subdistrict, responsiblePerson)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(u => {
        const searchableText = [
          u.unitNumber,
          u.unitName,
          u.location,
          u.district,
          u.subdistrict,
          u.responsiblePerson,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        
        return searchableText.includes(query);
      });
    }

    return filtered;
  }, [electionUnits, selectedElectionDistrict, selectedAmphoe, selectedSubdistrict, selectedVillage, searchQuery]);

  // Reset dependent dropdowns when parent changes
  const handleElectionDistrictChange = (value: string) => {
    setSelectedElectionDistrict(value);
    setSelectedAmphoe("");
    setSelectedSubdistrict("");
    setSelectedVillage("");
  };

  const handleAmphoeChange = (value: string) => {
    setSelectedAmphoe(value);
    setSelectedSubdistrict("");
    setSelectedVillage("");
  };

  const handleSubdistrictChange = (value: string) => {
    setSelectedSubdistrict(value);
    setSelectedVillage("");
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-orange-700">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">เกิดข้อผิดพลาด: {error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-orange-900 mb-2">
              ข้อมูลหน่วยเลือกตั้ง
            </h1>
            <p className="text-orange-700 text-sm sm:text-base">
              แผนที่และรายละเอียดหน่วยเลือกตั้งทั้งหมด
            </p>
          </div>

          {/* Search Filters */}
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200 mb-6">
            <h2 className="text-xl font-bold text-orange-900 mb-4">
              ค้นหาหน่วยเลือกตั้ง
            </h2>
            
            {/* ค้นหา */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-orange-800 mb-2">
                ค้นหา
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขหน่วย, ชื่อหน่วย, สถานที่, อำเภอ, ตำบล, ผู้รับผิดชอบ..."
                className="w-full px-4 py-3 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base text-left"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* เขตเลือกตั้ง */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  เขตเลือกตั้ง
                </label>
                <select
                  value={selectedElectionDistrict}
                  onChange={(e) => handleElectionDistrictChange(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base appearance-none bg-white"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23ea580c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                >
                  <option value="">ทั้งหมด</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((district) => (
                    <option key={district} value={String(district)}>
                      เขต {district}
                    </option>
                  ))}
                </select>
              </div>

              {/* อำเภอ */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  อำเภอ
                </label>
                <select
                  value={selectedAmphoe}
                  onChange={(e) => handleAmphoeChange(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base appearance-none bg-white"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23ea580c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                >
                  <option value="">ทั้งหมด</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              {/* ตำบล */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  ตำบล
                </label>
                <select
                  value={selectedSubdistrict}
                  onChange={(e) => handleSubdistrictChange(e.target.value)}
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

              {/* หมู่ */}
              <div>
                <label className="block text-sm font-semibold text-orange-800 mb-2">
                  หมู่
                </label>
                <select
                  value={selectedVillage}
                  onChange={(e) => setSelectedVillage(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none text-sm sm:text-base appearance-none bg-white"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23ea580c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                >
                  <option value="">ทั้งหมด</option>
                  {villages.map((village) => (
                    <option key={village} value={village}>
                      หมู่ {village}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Map Section */}
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200 mb-6">
            <h2 className="text-xl font-bold text-orange-900 mb-4">
              แผนที่หน่วยเลือกตั้ง
            </h2>
            <ElectionUnitMap units={filteredUnits} />
          </div>

          {/* Units List */}
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200">
            <h2 className="text-xl font-bold text-orange-900 mb-4">
              รายชื่อหน่วยเลือกตั้ง ({filteredUnits.length} หน่วย)
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredUnits.map((unit, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                          หน่วยที่ {unit.unitNumber}
                        </span>
                        <span className="text-sm text-gray-600">
                          หมู่ {unit.village || "-"}
                        </span>
                      </div>
                      <p className="text-gray-800 font-medium mb-2">
                        {unit.unitName || "-"}
                      </p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          📍 <span className="font-medium">สถานที่:</span> {unit.location || "-"}
                        </p>
                        <p>
                          🏘️ <span className="font-medium">ตำบล:</span> {unit.subdistrict || "-"}
                        </p>
                        <p>
                          🏛️ <span className="font-medium">อำเภอ:</span> {unit.district || "-"}
                        </p>
                        {unit.responsiblePerson && (
                          <p>
                            👤 <span className="font-medium">ผู้รับผิดชอบ:</span> {unit.responsiblePerson}
                          </p>
                        )}
                        {unit.contactNumber && (
                          <p>
                            📞 <span className="font-medium">หมายเลขติดต่อ:</span>{" "}
                            <a
                              href={`tel:${unit.contactNumber.replace(/\s/g, '')}`}
                              className="text-orange-600 hover:text-orange-800 hover:underline font-medium"
                            >
                              {unit.contactNumber}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {unit.googleMapLink ? (
                        <a
                          href={unit.googleMapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-800 hover:underline text-sm font-medium whitespace-nowrap flex items-center gap-1"
                        >
                          เปิดใน Google Maps
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">ไม่มีลิงก์แผนที่</span>
                      )}
                      {unit.lat && unit.lng && (
                        <span className="text-xs text-gray-400">
                          พิกัด: {unit.lat.toFixed(6)}, {unit.lng.toFixed(6)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
