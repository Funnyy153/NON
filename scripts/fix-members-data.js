const fs = require('fs');
const path = require('path');

// อ่านไฟล์ members.ts
const membersFile = path.join(__dirname, '..', 'app', 'data', 'members.ts');
const content = fs.readFileSync(membersFile, 'utf-8');

// แยกข้อมูลที่มีอยู่
const members = [];
const lines = content.split('\n');
let inArray = false;

for (const line of lines) {
  if (line.trim().startsWith('export const members')) {
    inArray = true;
    continue;
  }
  if (inArray && line.trim().startsWith('];')) {
    break;
  }
  if (inArray && line.trim().startsWith('{')) {
    // Parse existing member
    const match = line.match(/\{ memberId: "([^"]+)", firstName: "([^"]+)", lastName: "([^"]+)", memberType: "([^"]+)", phone: "([^"]*)", district: "([^"]*)" \}/);
    if (match) {
      members.push({
        memberId: match[1],
        firstName: match[2],
        lastName: match[3],
        memberType: match[4],
        phone: match[5],
        district: match[6],
      });
    }
  }
}

// อ่านไฟล์ CSV ทั้ง 4 ไฟล์เพื่อแก้ไขข้อมูล
const csvFiles = [
  { path: 'C:\\Users\\funny\\Downloads\\บางบัวทอง - Sheet1 (1).csv', startLine: 4 },
  { path: 'C:\\Users\\funny\\Downloads\\เมือง - Sheet1.csv', startLine: 2 },
  { path: 'C:\\Users\\funny\\Downloads\\ปากเกร็ด - Sheet1.csv', startLine: 3 },
  { path: 'C:\\Users\\funny\\Downloads\\บางใหญ่ - Sheet1.csv', startLine: 3 },
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

// สร้าง map สำหรับเก็บข้อมูลที่ถูกต้องจาก CSV
const correctDataMap = new Map();

for (const fileInfo of csvFiles) {
  const content = fs.readFileSync(fileInfo.path, 'utf-8');
  const lines = content.split('\n');
  
  for (let i = fileInfo.startLine - 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',')) continue;
    
    const parts = parseCSVLine(line);
    
    let memberId, firstName, lastName, memberType, phone, district;
    
    if (fileInfo.path.includes('บางบัวทอง')) {
      if (parts.length < 10) continue;
      memberId = parts[0];
      // ข้ามคำนำหน้า (index 4) ใช้ index 5=ชื่อ, 6=นามสกุล, 7=ประเภท, 8=เบอร์, 9=ตำบล
      firstName = parts[5] || '';
      lastName = parts[6] || '';
      memberType = parts[7] || '';
      phone = parts[8] || '';
      district = parts[9] || '';
    } else {
      if (parts.length < 11) continue;
      memberId = parts[1];
      // ข้ามคำนำหน้า (index 5) ใช้ index 6=ชื่อ, 7=นามสกุล, 8=ประเภท, 9=เบอร์, 10=ตำบล
      firstName = parts[6] || '';
      lastName = parts[7] || '';
      memberType = parts[8] || '';
      phone = parts[9] || '';
      district = parts[10] || '';
    }
    
    if (memberId && firstName && lastName && memberType && district) {
      correctDataMap.set(memberId, {
        memberId: memberId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        memberType: memberType.trim(),
        phone: phone.trim(),
        district: district.trim(),
      });
    }
  }
}

// แก้ไขข้อมูลที่ผิดพลาด
let fixedCount = 0;
for (let i = 0; i < members.length; i++) {
  const member = members[i];
  const correctData = correctDataMap.get(member.memberId);
  
  if (correctData) {
    // ตรวจสอบว่าข้อมูลผิดพลาดหรือไม่
    if (member.firstName !== correctData.firstName || 
        member.lastName !== correctData.lastName ||
        member.district !== correctData.district ||
        member.phone !== correctData.phone ||
        member.memberType !== correctData.memberType) {
      // แก้ไขข้อมูล
      members[i] = correctData;
      fixedCount++;
    }
  }
}

// สร้างไฟล์ members.ts ใหม่
let output = `export interface Member {
  memberId: string;
  firstName: string;
  lastName: string;
  memberType: string;
  phone: string;
  district: string;
}

export const members: Member[] = [
`;

for (const member of members) {
  output += `  { memberId: "${member.memberId}", firstName: "${member.firstName}", lastName: "${member.lastName}", memberType: "${member.memberType}", phone: "${member.phone}", district: "${member.district}" },\n`;
}

output += `];\n`;

// เขียนไฟล์
fs.writeFileSync(membersFile, output, 'utf-8');

console.log(`แก้ไขข้อมูล ${fixedCount} รายการ`);
console.log(`รวมทั้งหมด ${members.length} รายการ`);
