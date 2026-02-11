// Utility functions for parsing election units from Google Sheets CSV

export interface ElectionUnit {
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

// ฟังก์ชัน parse CSV line
export function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
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
export function parseCoordinates(coordString: string): { lat: number; lng: number } | null {
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

// ฟังก์ชัน parse ข้อมูลจาก CSV string
export function parseElectionUnitsFromCSV(
  csvContent: string,
  electionDistrict: string,
  startLine: number = 1
): ElectionUnit[] {
  const units: ElectionUnit[] = [];
  
  if (!csvContent || typeof csvContent !== 'string') {
    throw new Error('Invalid CSV content: content is not a string');
  }
  
  const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length < startLine) {
    console.warn(`CSV has only ${lines.length} lines, expected at least ${startLine}`);
    return [];
  }
  
  // Log total lines for district 3
  if (electionDistrict === '3') {
    console.log(`[District 3 CSV] Total non-empty lines: ${lines.length}, starting from line ${startLine}`);
  }
  
  let skippedCount = 0;
  let skippedReasons: Record<string, number> = {};
  
  for (let i = startLine - 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length === 0) {
      skippedCount++;
      skippedReasons['empty_line'] = (skippedReasons['empty_line'] || 0) + 1;
      continue;
    }
    
    // Skip lines that are clearly not data (like all commas or header-like patterns)
    if (line.startsWith(',') && line.split(',').filter(p => p.trim()).length < 3) {
      skippedCount++;
      skippedReasons['starts_with_comma'] = (skippedReasons['starts_with_comma'] || 0) + 1;
      continue;
    }
    
    try {
      const parts = parseCSVLine(line);
    
    // ตรวจสอบรูปแบบโดยดูจำนวนคอลัมน์
    // Updated Google Sheets structure with KeyID in column A:
    // A=KeyID, B=หน่วยที่, C=ชื่อหน่วย, D=สถานที่, E=อำเภอ, F=ตำบล, G=หมู่,
    // H=สำนักทะเบียน, I-K=ข้อมูลผู้มีสิทธิ, L=ผู้ลงทะเบียนนอกราชอาณาจักร,
    // M=ผู้ลงทะเบียนนอกเขต, N=พิกัด, O=google map, P=ผู้รับผิดชอบหน่วย, Q=หมายเลขติดต่อ, R=หมายเหตุ
    // Total: 18 columns minimum (A-R)
    
    let unitNumber: string;
    let unitName: string;
    let location: string;
    let district: string;
    let subdistrict: string;
    let village: string;
    let coordinates: string;
    let googleMapLink: string;
    let responsiblePerson: string;
    let contactNumber: string;
    
    // Always use the full structure with 18+ columns (including KeyID)
    // Column indices: A=KeyID (0), B=หน่วยที่ (1), C=ชื่อหน่วย (2), D=สถานที่ (3), E=อำเภอ (4), F=ตำบล (5), G=หมู่ (6),
    // H=สำนักทะเบียน (7), I-K=ข้อมูลผู้มีสิทธิ (8-10), L=ผู้ลงทะเบียนนอกราชอาณาจักร (11),
    // M=ผู้ลงทะเบียนนอกเขต (12), N=พิกัด (13), O=google map (14), P=ผู้รับผิดชอบ (15), Q=หมายเลขติดต่อ (16)
    // Minimum required: B, C, E, F (unitNumber, unitName, district, subdistrict) - skip KeyID in A
    // Accept rows with at least 5 columns (A=KeyID, B, C, E, F minimum)
    if (parts.length >= 5) {
      // Column structure with KeyID: A=KeyID (0), B=หน่วยที่ (1), C=ชื่อหน่วย (2), D=สถานที่ (3), E=อำเภอ (4), F=ตำบล (5), G=หมู่ (6)
      unitNumber = parts[1] || ''; // Column B (skip KeyID in A)
      unitName = parts[2] || ''; // Column C
      location = parts.length > 3 ? (parts[3] || '') : ''; // Column D (may not exist)
      district = parts.length > 4 ? (parts[4] || '') : ''; // Column E
      subdistrict = parts.length > 5 ? (parts[5] || '') : ''; // Column F
      village = parts.length > 6 ? (parts[6] || '') : ''; // Column G
      
      // Log for district 3 if we have unusual column count
      if (electionDistrict === '3' && parts.length < 7 && i < 20) {
        console.log(`[District 3 CSV] Line ${i + 1} has ${parts.length} columns:`, {
          keyId: parts[0] || '',
          unitNumber,
          unitName: unitName.substring(0, 30),
          district,
          subdistrict,
          parts: parts.slice(0, 7)
        });
      }
      
      // For coordinates (N), google map (O), responsible person (P), contact (Q)
      // These are at indices 13, 14, 15, 16 (shifted by 1 due to KeyID)
      // We need at least 17 parts to have all columns
      if (parts.length >= 17) {
        coordinates = parts[13] || ''; // Column N (index 13)
        googleMapLink = parts[14] || ''; // Column O (index 14)
        responsiblePerson = parts[15] || ''; // Column P (index 15)
        contactNumber = parts[16] || ''; // Column Q (index 16)
      } else if (parts.length >= 15) {
        // If we have 15 parts, we might have N and O but not P and Q
        coordinates = parts[13] || '';
        googleMapLink = parts[14] || '';
        responsiblePerson = '';
        contactNumber = '';
      } else if (parts.length >= 14) {
        // If we have 14 parts, we might have N but not O, P, Q
        coordinates = parts[13] || '';
        googleMapLink = '';
        responsiblePerson = '';
        contactNumber = '';
      } else {
        // If we have less than 14 parts, we don't have coordinates column
        coordinates = '';
        googleMapLink = '';
        responsiblePerson = '';
        contactNumber = '';
      }
    } else {
      // If we have less than 4 columns, skip this row
      skippedCount++;
      skippedReasons[`insufficient_columns_${parts.length}`] = (skippedReasons[`insufficient_columns_${parts.length}`] || 0) + 1;
      
      // Log lines with missing subdistricts
      if (electionDistrict === '3') {
        // With KeyID, subdistrict is now at index 5 (was 4)
        const subdistrictInLine = parts[5] || parts[4] || parts[3] || '';
        if (['บางกรวย', 'วัดชลอ', 'บางไผ่'].some(s => subdistrictInLine && subdistrictInLine.includes(s))) {
          console.warn(`[District 3 CSV] Skipped line ${i + 1} with subdistrict "${subdistrictInLine}" (only ${parts.length} columns):`, {
            line: line.substring(0, 200),
            parts: parts
          });
        } else if (parts.length > 0) {
          // Log first few skipped rows to understand the pattern
          if (i < 10) {
            console.warn(`[District 3 CSV] Skipped line ${i + 1} (only ${parts.length} columns):`, {
              line: line.substring(0, 150),
              parts: parts
            });
          }
        }
      }
      continue; // ข้ามแถวที่ไม่ครบถ้วน
    }
    
      // ตรวจสอบว่ามีข้อมูลสำคัญครบถ้วน (ต้องมี unitNumber)
      // unitName can be empty, but unitNumber is required
      const trimmedUnitNumber = unitNumber.trim();
      const trimmedUnitName = unitName.trim();
      const trimmedDistrict = district.trim();
      const trimmedSubdistrict = subdistrict.trim();
      
      // Skip if this looks like a header row
      const isHeaderRow = trimmedUnitNumber.includes('หน่วยที่เลือกตั้ง') || 
                          trimmedUnitNumber.includes('หน่วยที่*') ||
                          (trimmedUnitNumber === '' && trimmedUnitName.includes('ชื่อหน่วย'));
      
      if (isHeaderRow) {
        skippedCount++;
        skippedReasons['header_row'] = (skippedReasons['header_row'] || 0) + 1;
        continue;
      }
      
      // Accept rows with unitNumber (numeric or non-empty) and at least district or subdistrict
      if (trimmedUnitNumber && (trimmedDistrict || trimmedSubdistrict)) {
        // Check if unitNumber is numeric (actual data) or non-empty string
        const isNumericUnitNumber = /^\d+$/.test(trimmedUnitNumber);
        
        if (isNumericUnitNumber || trimmedUnitNumber) {
          const coords = parseCoordinates(coordinates);
          
          units.push({
            unitNumber: trimmedUnitNumber,
            unitName: trimmedUnitName || `หน่วยที่ ${trimmedUnitNumber}`,
            location: location.trim(),
            district: trimmedDistrict,
            subdistrict: trimmedSubdistrict,
            village: village.trim(),
            googleMapLink: googleMapLink.trim(),
            responsiblePerson: responsiblePerson.trim(),
            contactNumber: contactNumber.trim(),
            electionDistrict: electionDistrict,
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null,
          });
        } else {
          skippedCount++;
          skippedReasons['invalid_unitNumber'] = (skippedReasons['invalid_unitNumber'] || 0) + 1;
          
          // Log for district 3
          if (electionDistrict === '3' && i < 10) {
            console.warn(`[District 3 CSV] Skipped line ${i + 1} with invalid unitNumber:`, {
              unitNumber: trimmedUnitNumber,
              unitName: trimmedUnitName,
              subdistrict: trimmedSubdistrict,
              partsLength: parts.length
            });
          }
        }
      } else {
        skippedCount++;
        skippedReasons['missing_required_fields'] = (skippedReasons['missing_required_fields'] || 0) + 1;
        
        // Log lines with missing subdistricts that were skipped
        if (electionDistrict === '3') {
          if (['บางกรวย', 'วัดชลอ', 'บางไผ่'].some(s => trimmedSubdistrict && trimmedSubdistrict.includes(s))) {
            console.warn(`[District 3 CSV] Skipped line ${i + 1} with subdistrict "${trimmedSubdistrict}" (missing required fields):`, {
              unitNumber: trimmedUnitNumber,
              unitName: trimmedUnitName,
              district: trimmedDistrict,
              subdistrict: trimmedSubdistrict,
              partsLength: parts.length,
              line: line.substring(0, 200)
            });
          }
        }
      }
    } catch (parseError) {
      // Log error but continue parsing other lines
      console.warn(`Error parsing line ${i + 1} in district ${electionDistrict}:`, parseError);
      skippedCount++;
      skippedReasons['parse_error'] = (skippedReasons['parse_error'] || 0) + 1;
      continue;
    }
  }
  
  // Log summary for district 3
  if (electionDistrict === '3') {
    const expectedRows = lines.length - (startLine - 1);
    const successRate = expectedRows > 0 ? ((units.length / expectedRows) * 100).toFixed(1) : '0';
    
    console.log(`[District 3 CSV] Parse summary:`, {
      totalLines: lines.length,
      startLine: startLine,
      startIndex: startLine - 1,
      endIndex: lines.length - 1,
      expectedRows: expectedRows,
      parsedUnits: units.length,
      skippedLines: skippedCount,
      skippedReasons: skippedReasons,
      successRate: `${successRate}%`,
      missingUnits: expectedRows - units.length
    });
    
    // Log first few skipped rows to understand why they were skipped
    if (skippedCount > 0 && Object.keys(skippedReasons).length > 0) {
      console.warn(`[District 3 CSV] Skipped ${skippedCount} rows. Reasons:`, skippedReasons);
      
      // If we're missing units, log more details
      if (expectedRows - units.length > 0) {
        console.warn(`[District 3 CSV] Missing ${expectedRows - units.length} units. CSV export may not include all rows from sheet.`);
        console.warn(`[District 3 CSV] Note: Google Sheets CSV export only includes rows with data. Empty rows are excluded.`);
        console.warn(`[District 3 CSV] If sheet has 201 rows but CSV has ${lines.length} lines, some rows may be empty or filtered.`);
      }
    }
    
    // Log sample of parsed units to verify data
    if (units.length > 0) {
      console.log(`[District 3 CSV] Sample parsed units (first 5):`, units.slice(0, 5).map(u => ({
        unitNumber: u.unitNumber,
        unitName: u.unitName.substring(0, 30),
        district: u.district,
        subdistrict: u.subdistrict
      })));
    }
  }
  
  return units;
}
