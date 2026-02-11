const fs = require('fs');
const path = require('path');

// ไฟล์ CSV ทั้ง 6 ไฟล์
const csvFiles = [
  { 
    path: 'C:\\Users\\funny\\Downloads\\รายชื่อสมาชืก บางบัวทอง tel(Sheet1).csv', 
    startLine: 3,
    type: 'บางบัวทอง'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\รายชื่อสมาชิก อเมือง  tel (Sheet1).csv', 
    startLine: 3,
    type: 'อเมือง'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\รายชื่อสมาชิก อ ไทรน้อย  tel(Sheet1).csv', 
    startLine: 3,
    type: 'ไทรน้อย'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\รายชื่อสมาชิก ปากเกร็ด tel(Sheet1).csv', 
    startLine: 3,
    type: 'ปากเกร็ด'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\รายชื่อสมาชิก บางกรวย tel 2(Sheet1).csv', 
    startLine: 3,
    type: 'บางกรวย'
  },
  { 
    path: 'C:\\Users\\funny\\Downloads\\รายชื่อสมาชิก นนทบุรี  บางใหญ๋  tel(Sheet1).csv', 
    startLine: 2,
    type: 'บางใหญ่'
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

// อ่านและ parse CSV ทั้งหมด
const allMembers = [];

for (const fileInfo of csvFiles) {
  console.log(`กำลังอ่านไฟล์: ${fileInfo.type}...`);
  
  if (!fs.existsSync(fileInfo.path)) {
    console.warn(`ไม่พบไฟล์: ${fileInfo.path}`);
    continue;
  }
  
  const content = fs.readFileSync(fileInfo.path, 'utf-8');
  const lines = content.split('\n');
  let count = 0;
  
  for (let i = fileInfo.startLine - 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length === 0) continue;
    
    const parts = parseCSVLine(line);
    
    let memberId, firstName, lastName, memberType, phone, district;
    let houseNumber = '', village = '', villageName = '', soi = '', road = '';
    
    if (fileInfo.type === 'บางบัวทอง') {
      // บางบัวทอง: index 1=memberId, 6=ชื่อ, 7=นามสกุล, 8=ประเภท, 9=เบอร์, 10=ตำบล, 11=บ้านเลขที่, 12=หมู่, 13=หมู่บ้าน, 14=ซอย, 15=ถนน
      if (parts.length < 11) continue;
      memberId = parts[1] || '';
      firstName = parts[6] || '';
      lastName = parts[7] || '';
      memberType = parts[8] || '';
      phone = parts[9] || '';
      district = parts[10] || '';
      houseNumber = parts[11] || '';
      village = parts[12] || '';
      villageName = parts[13] || '';
      soi = parts[14] || '';
      road = parts[15] || '';
    } else if (fileInfo.type === 'อเมือง') {
      // อเมือง: index 1=memberId, 6=ชื่อ, 7=นามสกุล, 8=ประเภท, 9=เบอร์, 10=ตำบล, 11=บ้านเลขที่, 12=หมู่, 13=หมู่บ้าน, 14=ซอย, 15=ถนน
      if (parts.length < 11) continue;
      memberId = parts[1] || '';
      firstName = parts[6] || '';
      lastName = parts[7] || '';
      memberType = parts[8] || '';
      phone = parts[9] || '';
      district = parts[10] || '';
      houseNumber = parts[11] || '';
      village = parts[12] || '';
      villageName = parts[13] || '';
      soi = parts[14] || '';
      road = parts[15] || '';
    } else if (fileInfo.type === 'ไทรน้อย') {
      // ไทรน้อย: index 1=memberId, 6=ชื่อ, 7=นามสกุล, 8=ประเภท, 9=เบอร์, 10=ตำบล, 11=บ้านเลขที่, 12=หมู่, 13=หมู่บ้าน, 14=ซอย, 15=ถนน
      if (parts.length < 11) continue;
      memberId = parts[1] || '';
      firstName = parts[6] || '';
      lastName = parts[7] || '';
      memberType = parts[8] || '';
      phone = parts[9] || '';
      district = parts[10] || '';
      houseNumber = parts[11] || '';
      village = parts[12] || '';
      villageName = parts[13] || '';
      soi = parts[14] || '';
      road = parts[15] || '';
    } else if (fileInfo.type === 'ปากเกร็ด') {
      // ปากเกร็ด: index 1=memberId, 6=ชื่อ, 7=นามสกุล, 8=ประเภท, 9=เบอร์, 10=ตำบล, 11=บ้านเลขที่, 12=หมู่, 13=หมู่บ้าน, 14=ซอย, 15=ถนน
      if (parts.length < 11) continue;
      memberId = parts[1] || '';
      firstName = parts[6] || '';
      lastName = parts[7] || '';
      memberType = parts[8] || '';
      phone = parts[9] || '';
      district = parts[10] || '';
      houseNumber = parts[11] || '';
      village = parts[12] || '';
      villageName = parts[13] || '';
      soi = parts[14] || '';
      road = parts[15] || '';
    } else if (fileInfo.type === 'บางกรวย') {
      // บางกรวย: index 1=memberId, 6=ชื่อ, 7=นามสกุล, 8=ประเภท, 9=เบอร์, 10=ตำบล, 11=บ้านเลขที่, 12=หมู่, 13=หมู่บ้าน, 14=ซอย, 15=ถนน
      if (parts.length < 11) continue;
      memberId = parts[1] || '';
      firstName = parts[6] || '';
      lastName = parts[7] || '';
      memberType = parts[8] || '';
      phone = parts[9] || '';
      district = parts[10] || '';
      houseNumber = parts[11] || '';
      village = parts[12] || '';
      villageName = parts[13] || '';
      soi = parts[14] || '';
      road = parts[15] || '';
    } else if (fileInfo.type === 'บางใหญ่') {
      // บางใหญ่: index 1=memberId, 6=ชื่อ, 7=นามสกุล, 8=ประเภท, 9=เบอร์, 10=ตำบล, 11=บ้านเลขที่, 12=หมู่, 13=หมู่บ้าน, 14=ซอย, 15=ถนน
      if (parts.length < 11) continue;
      memberId = parts[1] || '';
      firstName = parts[6] || '';
      lastName = parts[7] || '';
      memberType = parts[8] || '';
      phone = parts[9] || '';
      district = parts[10] || '';
      houseNumber = parts[11] || '';
      village = parts[12] || '';
      villageName = parts[13] || '';
      soi = parts[14] || '';
      road = parts[15] || '';
    }
    
    // ตรวจสอบว่ามีข้อมูลสำคัญครบถ้วน
    if (memberId && firstName && lastName && memberType && district) {
      // ลบคำนำหน้าออกจากชื่อ (ถ้ามี)
      const cleanFirstName = firstName.replace(/^(นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง)\s*/i, '').trim();
      
      allMembers.push({
        memberId: memberId.trim(),
        firstName: cleanFirstName || firstName.trim(),
        lastName: lastName.trim(),
        memberType: memberType.trim(),
        phone: phone.trim(),
        district: district.trim(),
        houseNumber: houseNumber.trim(),
        village: village.trim(),
        villageName: villageName.trim(),
        soi: soi.trim(),
        road: road.trim(),
      });
      count++;
    }
  }
  
  console.log(`  - อ่านได้ ${count} รายการจาก ${fileInfo.type}`);
}

// ลบสมาชิกซ้ำ (ใช้ memberId เป็น key)
const uniqueMembers = [];
const memberIdSet = new Set();

for (const member of allMembers) {
  if (!memberIdSet.has(member.memberId)) {
    memberIdSet.add(member.memberId);
    uniqueMembers.push(member);
  } else {
    // ถ้าซ้ำ ให้ใช้ข้อมูลที่ใหม่กว่า (มีข้อมูลที่อยู่มากกว่า)
    const existingIndex = uniqueMembers.findIndex(m => m.memberId === member.memberId);
    if (existingIndex >= 0) {
      const existing = uniqueMembers[existingIndex];
      // ถ้าข้อมูลใหม่มีข้อมูลที่อยู่มากกว่า ให้แทนที่
      const newHasMoreAddress = (member.houseNumber || member.village || member.villageName || member.soi || member.road).length > 
                                  (existing.houseNumber || existing.village || existing.villageName || existing.soi || existing.road).length;
      if (newHasMoreAddress) {
        uniqueMembers[existingIndex] = member;
      }
    }
  }
}

console.log(`\nรวมทั้งหมด ${allMembers.length} รายการ`);
console.log(`ลบซ้ำแล้วเหลือ ${uniqueMembers.length} รายการ`);

// สร้างไฟล์ members.ts ใหม่
const membersFile = path.join(__dirname, '..', 'app', 'data', 'members.ts');

let output = `export interface Member {
  memberId: string;
  firstName: string;
  lastName: string;
  memberType: string;
  phone: string;
  district: string;
  houseNumber: string;
  village: string;
  villageName: string;
  soi: string;
  road: string;
}

export const members: Member[] = [
`;

// เรียงลำดับตาม memberId
uniqueMembers.sort((a, b) => a.memberId.localeCompare(b.memberId));

for (const member of uniqueMembers) {
  // Escape quotes และ newlines ใน string
  const escape = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  };
  
  output += `  { memberId: "${escape(member.memberId)}", firstName: "${escape(member.firstName)}", lastName: "${escape(member.lastName)}", memberType: "${escape(member.memberType)}", phone: "${escape(member.phone)}", district: "${escape(member.district)}", houseNumber: "${escape(member.houseNumber)}", village: "${escape(member.village)}", villageName: "${escape(member.villageName)}", soi: "${escape(member.soi)}", road: "${escape(member.road)}" },\n`;
}

output += `];\n`;

// เขียนไฟล์
fs.writeFileSync(membersFile, output, 'utf-8');

console.log(`\n✅ สร้างไฟล์ ${membersFile} เรียบร้อยแล้ว`);
console.log(`   - รวม ${uniqueMembers.length} รายการ`);
console.log(`   - เพิ่มฟิลด์ที่อยู่: houseNumber, village, villageName, soi, road`);
