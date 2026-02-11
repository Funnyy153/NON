"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { electionUnits, type ElectionUnit } from "../data/electionUnits";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Function to format election district number
function formatElectionDistrict(electionDistrict: string): string {
  if (!electionDistrict) return "";
  return `เขต ${electionDistrict}`;
}

// Component to fit bounds when markers are loaded
function MapBoundsFitter({ units }: { units: ElectionUnit[] }) {
  const map = useMap();
  const [fitted, setFitted] = useState(false);

  useEffect(() => {
    if (!fitted) {
      const unitsWithCoords = units.filter(
        (u) => u.lat !== null && u.lng !== null
      );

      if (unitsWithCoords.length > 0) {
        const bounds = L.latLngBounds(
          unitsWithCoords.map((u) => [u.lat!, u.lng!])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
        setFitted(true);
      }
    }
  }, [map, fitted, units]);

  return null;
}

// Function to get color for each election district
function getDistrictColor(electionDistrict: string): { bg: string; text: string } {
  switch (electionDistrict) {
    case "1":
      return { bg: "#325a66", text: "#ffffff" }; // เขต 1
    case "2":
      return { bg: "#543583", text: "#ffffff" }; // เขต 2
    case "3":
      return { bg: "#c9dbdf", text: "#1e293b" }; // เขต 3
    case "4":
      return { bg: "#cadff0", text: "#1e293b" }; // เขต 4
    case "5":
      return { bg: "#d7ecc1", text: "#1e293b" }; // เขต 5
    case "6":
      return { bg: "#f7e7a9", text: "#1e293b" }; // เขต 6
    case "7":
      return { bg: "#f6cab1", text: "#1e293b" }; // เขต 7
    case "8":
      return { bg: "#f9b9ad", text: "#1e293b" }; // เขต 8
    default:
      return { bg: "#ea580c", text: "#ffffff" }; // Default: orange
  }
}

// Custom marker icon with number
function createCustomIcon(unitNumber: string, electionDistrict: string) {
  const colors = getDistrictColor(electionDistrict);
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${colors.bg};
        color: ${colors.text};
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 11px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        cursor: pointer;
        transition: transform 0.2s;
      ">
        ${unitNumber}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

interface ElectionUnitMap5Props {
  units?: ElectionUnit[];
}

export default function ElectionUnitMap5({ units = electionUnits }: ElectionUnitMap5Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter units that have coordinates
  const unitsWithCoords = units.filter(
    (u) => u.lat !== null && u.lng !== null
  );

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">กำลังโหลดแผนที่...</p>
      </div>
    );
  }

  // Default center (นนทบุรี)
  const centerLat = 13.8300;
  const centerLng = 100.3750;

  return (
    <div className="w-full relative" style={{ zIndex: 1 }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        style={{ height: "500px", width: "100%", borderRadius: "0.5rem", zIndex: 1 }}
        className="border-2 border-orange-200"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsFitter units={units} />
        
        {unitsWithCoords.map((unit, index) => (
          <Marker
            key={`${unit.unitNumber}-${index}`}
            position={[unit.lat!, unit.lng!]}
            icon={createCustomIcon(unit.unitNumber, unit.electionDistrict || "")}
          >
            <Popup autoPan={true} autoPanPaddingTopLeft={[0, 100]} autoPanPaddingBottomRight={[0, 20]}>
              <div style={{ padding: "8px", maxWidth: "300px" }}>
                <h3
                  style={{
                    margin: "0 0 8px 0",
                    fontWeight: "bold",
                    color: "#ea580c",
                    fontSize: "16px",
                  }}
                >
                  หน่วยที่ {unit.unitNumber}
                </h3>
                {unit.unitName && (
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      color: "#333",
                      fontSize: "14px",
                      lineHeight: "1.4",
                    }}
                  >
                    {unit.unitName}
                  </p>
                )}
                {unit.electionDistrict && (
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      color: "#333",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    เขตเลือกตั้ง: {formatElectionDistrict(unit.electionDistrict)}
                  </p>
                )}
                {unit.googleMapLink && (
                  <div style={{ marginTop: "10px" }}>
                    <a
                      href={unit.googleMapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#ea580c",
                        textDecoration: "none",
                        fontSize: "14px",
                        display: "inline-block",
                        padding: "6px 12px",
                        background: "#fff3e0",
                        borderRadius: "4px",
                        border: "1px solid #ea580c",
                      }}
                    >
                      เปิดใน Google Maps →
                    </a>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">
        คลิกที่หมุดเพื่อดูรายละเอียดหน่วยเลือกตั้ง | พบ {unitsWithCoords.length} จาก {units.length} หน่วย
      </p>
    </div>
  );
}
