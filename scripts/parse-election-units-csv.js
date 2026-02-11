const fs = require('fs');
const path = require('path');

// อ่านไฟล์ CSV
const csvFile = 'C:\\Users\\funny\\Downloads\\สเปรดชีตไม่มีชื่อ - ชีต1.csv';
const content = fs.readFileSync(csvFile, 'utf-8');

// ฟังก์ชัน parse CSV line
function parseCSVLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

// Parse CSV
const lines = content.split('\n');
const headers = parseCSVLine(lines[0]);
const units = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith(',')) continue;
  
  const parts = parseCSVLine(line);
  
  // คอลัมน์: 0=หน่วยที่, 1=ชื่อหน่วย, 2=สถานที่, 3=อำเภอ, 4=ตำบล, 5=หมู่, 6=ผู้มีสิทธิ์, 7=พิกัด, 8=google map, 9=ผู้รับผิดชอบ, 10=หมายเลขติดต่อ, 11=หมายเหตุ
  const unitNumber = parts[0] || '';
  const unitName = parts[1] || '';
  const location = parts[2] || '';
  const district = parts[3] || '';
  const subdistrict = parts[4] || '';
  const village = parts[5] || '';
  const googleMapLink = parts[8] || '';
  
  // ข้ามแถวที่ว่าง
  if (!unitNumber || !unitName) continue;
  
  units.push({
    unitNumber: unitNumber.trim(),
    unitName: unitName.trim(),
    location: location.trim(),
    district: district.trim(),
    subdistrict: subdistrict.trim(),
    village: village.trim(),
    googleMapLink: googleMapLink.trim(),
  });
}

// สร้างไฟล์ TypeScript
const outputFile = path.join(__dirname, '..', 'app', 'data', 'electionUnits.ts');

const fileContent = `export interface ElectionUnit {
  unitNumber: string;
  unitName: string;
  location: string;
  district: string;
  subdistrict: string;
  village: string;
  googleMapLink: string;
}

export const electionUnits: ElectionUnit[] = [
${units.map(unit => `  {
    unitNumber: "${unit.unitNumber}",
    unitName: "${unit.unitName.replace(/"/g, '\\"')}",
    location: "${unit.location.replace(/"/g, '\\"')}",
    district: "${unit.district.replace(/"/g, '\\"')}",
    subdistrict: "${unit.subdistrict.replace(/"/g, '\\"')}",
    village: "${unit.village.replace(/"/g, '\\"')}",
    googleMapLink: "${unit.googleMapLink}",
  }`).join(',\n')}
];
`;

fs.writeFileSync(outputFile, fileContent, 'utf-8');
console.log(`สร้างไฟล์ ${outputFile} สำเร็จ`);
console.log(`จำนวนหน่วยเลือกตั้ง: ${units.length} หน่วย`);