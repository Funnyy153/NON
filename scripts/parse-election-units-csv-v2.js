const fs = require('fs');
const path = require('path');

// ไฟล์ CSV ทั้ง 8 ไฟล์ (เขต 1-8)
const csvFiles = [
  { 
    path: 'C:\\Users\\funny\\Downloads\\ข้อมูลหน่วยเลือกตั้ง นนทบุรี - เขต 1.csv', 
    startLine: 2,
    electionDistrict: '1'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\ข้อมูลหน่วยเลือกตั้ง นนทบุรี - เขต 2.csv', 
    startLine: 2,
    electionDistrict: '2'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\ข้อมูลหน่วยเลือกตั้ง นนทบุรี - เขต 3.csv', 
    startLine: 2,
    electionDistrict: '3'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\ข้อมูลหน่วยเลือกตั้ง นนทบุรี - เขต 4.csv', 
    startLine: 2,
    electionDistrict: '4'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\ข้อมูลหน่วยเลือกตั้ง นนทบุรี - เขต 5 (1).csv', 
    startLine: 2,
    electionDistrict: '5'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\ข้อมูลหน่วยเลือกตั้ง นนทบุรี - เขต 6.csv', 
    startLine: 2,
    electionDistrict: '6'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\ข้อมูลหน่วยเลือกตั้ง นนทบุรี - เขต 7.csv', 
    startLine: 2,
    electionDistrict: '7'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\ข้อมูลหน่วยเลือกตั้ง นนทบุรี - เขต 8.csv', 
    startLine: 2,
    electionDistrict: '8'
  },
];

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

// ฟังก์ชัน parse พิกัดจาก string "lat,lng"
function parseCoordinates(coordString) {
  if (!coordString || coordString.trim() === '') {
    return null;
  }
  
  // ลบ quotes ถ้ามี
  const cleaned = coordString.replace(/^"|"$/g, '').trim();
  
  // แยก lat และ lng
  const parts = cleaned.split(',');
  if (parts.length !== 2) {
    return null;
  }
  
  const lat = parseFloat(parts[0].trim());
  const lng = parseFloat(parts[1].trim());
  
  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }
  
  return { lat, lng };
}

// อ่านและ parse CSV ทั้งหมด
const allUnits = [];

for (const fileInfo of csvFiles) {
  console.log(`กำลังอ่านไฟล์: ${fileInfo.path}...`);
  
  if (!fs.existsSync(fileInfo.path)) {
    console.warn(`ไม่พบไฟล์: ${fileInfo.path}`);
    continue;
  }
  
  const content = fs.readFileSync(fileInfo.path, 'utf-8');
  const lines = content.split('\n');
  let count = 0;
  
  for (let i = fileInfo.startLine - 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length === 0 || line.startsWith(',')) continue;
    
    const parts = parseCSVLine(line);
    
    // CSV structure มี 2 รูปแบบ:
    // รูปแบบ 1 (เขต 3, 5): 0=หน่วยที่, 1=ชื่อหน่วย, 2=สถานที่, 3=อำเภอ, 4=ตำบล, 5=หมู่, 
    //   6=สำนักทะเบียน, 7-11=ข้อมูลผู้มีสิทธิ, 12=พิกัด, 13=google map link, 14=ผู้รับผิดชอบหน่วย, 15=หมายเลขติดต่อ
    // รูปแบบ 2 (เขต 1,2,4,6,7,8): 0=หน่วยที่, 1=ชื่อหน่วย, 2=อำเภอ, 3=ตำบล, 4=หมู่,
    //   5=สำนักทะเบียน, 6-10=ข้อมูลผู้มีสิทธิ, 11=พิกัด, 12=google map link, 13=ผู้รับผิดชอบหน่วย, 14=หมายเลขติดต่อ
    
    // ตรวจสอบรูปแบบโดยดูจำนวนคอลัมน์
    let unitNumber, unitName, location, district, subdistrict, village, coordinates, googleMapLink, responsiblePerson, contactNumber;
    
    // เขต 3, 5 มีคอลัมน์สถานที่ (คอลัมน์ที่ 2) และมีคอลัมน์มากกว่า
    // เขต 1,2,4,6,7,8 ไม่มีคอลัมน์สถานที่
    if (parts.length >= 16) {
      // รูปแบบ 1 (เขต 3, 5 - มีคอลัมน์สถานที่)
      unitNumber = parts[0] || '';
      unitName = parts[1] || '';
      location = parts[2] || '';
      district = parts[3] || '';
      subdistrict = parts[4] || '';
      village = parts[5] || '';
      coordinates = parts[12] || '';
      googleMapLink = parts[13] || '';
      responsiblePerson = parts[14] || '';
      contactNumber = parts[15] || '';
    } else if (parts.length >= 15) {
      // รูปแบบ 2 (เขต 1,2,4,6,7,8 - ไม่มีคอลัมน์สถานที่)
      unitNumber = parts[0] || '';
      unitName = parts[1] || '';
      location = ''; // ไม่มีข้อมูลสถานที่
      district = parts[2] || '';
      subdistrict = parts[3] || '';
      village = parts[4] || '';
      coordinates = parts[11] || '';
      googleMapLink = parts[12] || '';
      responsiblePerson = parts[13] || '';
      contactNumber = parts[14] || '';
    } else {
      continue; // ข้ามแถวที่ไม่ครบถ้วน
    }
    
    // ตรวจสอบว่ามีข้อมูลสำคัญครบถ้วน (ต้องมี unitNumber และ unitName)
    if (unitNumber && unitName) {
      const coords = parseCoordinates(coordinates);
      
      allUnits.push({
        unitNumber: unitNumber.trim(),
        unitName: unitName.trim(),
        location: location.trim(),
        district: district.trim(),
        subdistrict: subdistrict.trim(),
        village: village.trim(),
        googleMapLink: googleMapLink.trim(),
        responsiblePerson: responsiblePerson.trim(),
        contactNumber: contactNumber.trim(),
        electionDistrict: fileInfo.electionDistrict,
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
      });
      count++;
    }
  }
  
  console.log(`  - อ่านได้ ${count} รายการ`);
}

console.log(`\nรวมทั้งหมด ${allUnits.length} รายการ`);

// สร้างไฟล์ electionUnits.ts ใหม่
const unitsFile = path.join(__dirname, '..', 'app', 'data', 'electionUnits.ts');

let output = `export interface ElectionUnit {
  unitNumber: string;
  unitName: string;
  location: string;
  district: string;
  subdistrict: string;
  village: string;
  googleMapLink: string;
  responsiblePerson: string;
  contactNumber: string;
  electionDistrict: string;
  lat: number | null;
  lng: number | null;
}

export const electionUnits: ElectionUnit[] = [
`;

// เรียงลำดับตาม unitNumber
allUnits.sort((a, b) => {
  const numA = parseInt(a.unitNumber) || 0;
  const numB = parseInt(b.unitNumber) || 0;
  return numA - numB;
});

for (const unit of allUnits) {
  // Escape quotes และ newlines ใน string
  const escape = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  };
  
  const latStr = unit.lat !== null ? unit.lat : 'null';
  const lngStr = unit.lng !== null ? unit.lng : 'null';
  
  output += `  { unitNumber: "${escape(unit.unitNumber)}", unitName: "${escape(unit.unitName)}", location: "${escape(unit.location)}", district: "${escape(unit.district)}", subdistrict: "${escape(unit.subdistrict)}", village: "${escape(unit.village)}", googleMapLink: "${escape(unit.googleMapLink)}", responsiblePerson: "${escape(unit.responsiblePerson)}", contactNumber: "${escape(unit.contactNumber)}", electionDistrict: "${escape(unit.electionDistrict)}", lat: ${latStr}, lng: ${lngStr} },\n`;
}

output += `];\n`;

// เขียนไฟล์
fs.writeFileSync(unitsFile, output, 'utf-8');

console.log(`\n✅ สร้างไฟล์ ${unitsFile} เรียบร้อยแล้ว`);
console.log(`   - รวม ${allUnits.length} รายการ`);
console.log(`   - มีพิกัด: ${allUnits.filter(u => u.lat !== null && u.lng !== null).length} รายการ`);
