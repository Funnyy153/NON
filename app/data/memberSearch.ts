import { members, Member } from "./members";

/**
 * ค้นหาสมาชิกตามคำค้นหา
 * @param query คำค้นหา (สามารถค้นหาได้จาก เลขสมาชิก, ชื่อ, นามสกุล, เบอร์โทรศัพท์, อำเภอ, ตำบล, บ้านเลขที่, หมู่, หมู่บ้าน, ซอย, ถนน)
 * @returns รายการสมาชิกที่ตรงกับคำค้นหา
 */
export function searchMembers(query: string): Member[] {
  if (!query.trim()) {
    return members;
  }

  const searchTerm = query.toLowerCase().trim();

  return members.filter((member) => {
    const searchableText = [
      member.memberId,
      member.firstName,
      member.lastName,
      member.phone,
      member.district, // อำเภอ
      member.subdistrict, // ตำบล
      member.houseNumber,
      member.village,
      member.villageName,
      member.soi,
      member.road,
      `${member.firstName} ${member.lastName}`,
    ]
      .filter(Boolean) // ลบค่า empty string ออก
      .join(" ")
      .toLowerCase();

    return searchableText.includes(searchTerm);
  });
}

/**
 * ค้นหาสมาชิกตามเลขสมาชิก
 */
export function getMemberById(memberId: string): Member | undefined {
  return members.find((member) => member.memberId === memberId);
}

/**
 * ค้นหาสมาชิกตามเบอร์โทรศัพท์
 */
export function getMemberByPhone(phone: string): Member | undefined {
  return members.find((member) => member.phone === phone);
}

/**
 * ดึงรายการตำบลทั้งหมด (ไม่ซ้ำ)
 */
export function getSubdistricts(): string[] {
  const subdistricts = members
    .map((member) => member.subdistrict)
    .filter((subdistrict) => subdistrict.trim() !== "");
  return Array.from(new Set(subdistricts)).sort();
}

/**
 * @deprecated ใช้ getSubdistricts() แทน
 * ดึงรายการตำบลทั้งหมด (ไม่ซ้ำ) - เก็บไว้เพื่อ backward compatibility
 */
export function getDistricts(): string[] {
  return getSubdistricts();
}

/**
 * ดึงรายการประเภทสมาชิกทั้งหมด (ไม่ซ้ำ)
 */
export function getMemberTypes(): string[] {
  const types = members.map((member) => member.memberType);
  return Array.from(new Set(types)).sort();
}

/**
 * ดึงรายการอำเภอทั้งหมด (ไม่ซ้ำ)
 */
export function getAmphoes(): string[] {
  const amphoes = members
    .map((member) => member.district) // district = อำเภอ
    .filter((amphoe) => amphoe.trim() !== '');
  return Array.from(new Set(amphoes)).sort();
}
