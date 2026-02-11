const fs = require('fs');
const path = require('path');

// อ่านไฟล์ CSV ทั้ง 4 ไฟล์
const csvFiles = [
  { path: 'C:\\Users\\funny\\Downloads\\บางบัวทอง - Sheet1 (1).csv', startLine: 4 },
  { path: 'C:\\Users\\funny\\Downloads\\เมือง - Sheet1.csv', startLine: 2 },
  { path: 'C:\\Users\\funny\\Downloads\\ปากเกร็ด - Sheet1.csv', startLine: 3 },
  { path: 'C:\\Users\\funny\\Downloads\\บางใหญ่ - Sheet1.csv', startLine: 3 },
];

// อ่านไฟล์ members.ts ที่มีอยู่
const membersFile = path.join(__dirname, '..', 'app', 'data', 'members.ts');
const existingContent = fs.readFileSync(membersFile, 'utf-8');

// แยกข้อมูลที่มีอยู่
const existingMembers = [];
const lines = existingContent.split('\n');
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
      existingMembers.push({
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

// อ่านและ parse CSV ทั้ง 4 ไฟล์
const newMembers = [];

for (const fileInfo of csvFiles) {
  const content = fs.readFileSync(fileInfo.path, 'utf-8');
  const lines = content.split('\n');
  
  for (let i = fileInfo.startLine - 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',')) continue;
    
    const parts = parseCSVLine(line);
    
    // สำหรับบางบัวทอง: index 0=เลขสมาชิก, 5=ชื่อ, 6=นามสกุล, 7=ประเภทสมาชิก, 8=เบอร์โทร, 9=ตำบล
    // สำหรับเมือง: index 1=เลขสมาชิก, 5=ชื่อ, 6=นามสกุล, 7=ประเภทสมาชิก, 8=เบอร์โทร, 9=ตำบล
    // สำหรับปากเกร็ด: index 1=เลขสมาชิก, 5=ชื่อ, 6=นามสกุล, 7=ประเภทสมาชิก, 8=เบอร์โทร, 9=ตำบล
    // สำหรับบางใหญ่: index 1=เลขสมาชิก, 5=ชื่อ, 6=นามสกุล, 7=ประเภทสมาชิก, 8=เบอร์โทร, 9=ตำบล
    
    let memberId, firstName, lastName, memberType, phone, district;
    
    if (fileInfo.path.includes('บางบัวทอง')) {
      if (parts.length < 10) continue;
      memberId = parts[0];
      firstName = parts[5] || '';
      lastName = parts[6] || '';
      memberType = parts[7] || '';
      phone = parts[8] || '';
      district = parts[9] || '';
    } else {
      if (parts.length < 10) continue;
      memberId = parts[1];
      firstName = parts[5] || '';
      lastName = parts[6] || '';
      memberType = parts[7] || '';
      phone = parts[8] || '';
      district = parts[9] || '';
    }
    
    // ตรวจสอบว่ามีข้อมูลครบถ้วน
    if (memberId && firstName && lastName && memberType && district) {
      // ตรวจสอบว่า memberId ไม่ซ้ำกับที่มีอยู่แล้ว
      if (!existingMembers.find(m => m.memberId === memberId)) {
        newMembers.push({
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
}

// รวมข้อมูลทั้งหมด
const allMembers = [...existingMembers, ...newMembers];

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

for (const member of allMembers) {
  output += `  { memberId: "${member.memberId}", firstName: "${member.firstName}", lastName: "${member.lastName}", memberType: "${member.memberType}", phone: "${member.phone}", district: "${member.district}" },\n`;
}

output += `];\n`;

// เขียนไฟล์
fs.writeFileSync(membersFile, output, 'utf-8');

console.log(`เพิ่มสมาชิก ${newMembers.length} รายการ`);
console.log(`รวมทั้งหมด ${allMembers.length} รายการ`);
