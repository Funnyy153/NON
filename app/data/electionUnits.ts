// Re-export interface from lib
export type { ElectionUnit } from '@/app/lib/parseElectionUnits';

// This file now provides a hook to fetch data from Google Sheets directly (client-side)
// Using Google Sheets JSON API (gviz/tq) which works better than CSV export

import { useState, useEffect } from 'react';
import type { ElectionUnit } from '@/app/lib/parseElectionUnits';
import { parseElectionUnitsFromCSV } from '@/app/lib/parseElectionUnits';

// Google Sheets configuration
const SPREADSHEET_ID = '1haXNzWp1qKiz0ze_kU-Jg8x6J9TVeEYQBIl3gXlQHUQ';
const SHEET_GIDS = {
  '1': '33644158',
  '2': '1483354314',
  '3': '1976556479',
  '4': '544982661',
  '5': '926746415',
  '6': '1247121519',
  '7': '1787780738',
  '8': '1616095121',
};

// Helper function to parse Google Sheets JSON response and convert to ElectionUnit format directly
function parseGoogleSheetsToElectionUnits(
  jsonText: string,
  electionDistrict: string
): ElectionUnit[] {
  const jsonMatch = jsonText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Google Sheets');
  }
  
  const jsonData = JSON.parse(jsonMatch[1]);
  
  // For district 3, try using CSV export as fallback if JSON parsing fails
  // This is a workaround for the concatenated headers issue
  
  if (!jsonData.table || !jsonData.table.rows) {
    return [];
  }
  
  let headers = jsonData.table.cols.map((col: any) => col.label || '');
  let rows = jsonData.table.rows;
  
  // Store original headers for district 3 data extraction
  const originalHeaders = headers.slice();
  
  // District 3 uses the same parsing logic as other districts
  // No special handling needed
  
  // Check if headers are empty (some sheets have empty header row, with actual headers in first data row)
  const headersAreEmpty = headers.every((h: string) => !h || h.trim() === '');
  
  if (headersAreEmpty && rows.length > 0) {
    // Use first data row as headers
    const firstRow = rows[0];
    headers = firstRow.c.map((cell: any) => {
      if (cell) {
        // Use formatted value if available, otherwise raw value
        return cell.f ? String(cell.f) : (cell.v ? String(cell.v) : '');
      }
      return '';
    });
    // Skip the first row (which is now used as headers)
    rows = rows.slice(1);
    console.log(`[District ${electionDistrict}] Headers were empty, using first data row as headers:`, headers);
  }
  
  // Google Sheets JSON API returns data rows directly (not including header row)
  // Headers are in jsonData.table.cols, not in rows
  // So rows[0] is the first data row, not header row
  
  // Find column indices by exact header name with fallback to fixed positions
  const getColumnIndex = (exactName: string, alternatives: string[] = [], fixedIndex?: number): number => {
    // Try exact match first
    let index = headers.findIndex((h: string) => h.trim() === exactName);
    if (index >= 0) return index;
    
    // Try without asterisk
    const nameWithoutAsterisk = exactName.replace(/\*$/, '').trim();
    index = headers.findIndex((h: string) => h.trim() === nameWithoutAsterisk);
    if (index >= 0) return index;
    
    // Try alternatives
    for (const alt of alternatives) {
      index = headers.findIndex((h: string) => 
        h.toLowerCase().includes(alt.toLowerCase()) || alt.toLowerCase().includes(h.toLowerCase())
      );
      if (index >= 0) return index;
    }
    
    // Fallback to fixed index if provided
    if (fixedIndex !== undefined && fixedIndex < headers.length) {
      return fixedIndex;
    }
    
    return -1;
  };
  
  // Use only the specified columns (find by exact header name, no fixed index fallback):
  
  // Use only the specified columns (find by exact header name, no fixed index fallback):
  // 1. หน่วยที่เลือกตั้งที่*
  // 2. ชื่อหน่วยเลือกตั้ง*
  // 3. สถานที่
  // 4. อำเภอ*
  // 5. ตำบล*
  // 6. หมู่*
  // 7. พิกัด
  // 8. google,map*
  // 9. ผู้รับผิดชอบหน่วย*
  // 10. หมายเลขติดต่อ*
  
  // Find column indices by exact header name with fallback to fixed positions
  // Use the same approach for all districts including district 3
  // Updated structure with KeyID in column A:
  // A=KeyID (index 0), B=หน่วยที่ (index 1), C=ชื่อหน่วย (index 2), D=สถานที่ (index 3), 
  // E=อำเภอ (index 4), F=ตำบล (index 5), G=หมู่ (index 6), 
  // N=พิกัด (index 13), O=google map (index 14), P=ผู้รับผิดชอบ (index 15), Q=หมายเลขติดต่อ (index 16)
  const unitNumberIdx = getColumnIndex('หน่วยที่เลือกตั้งที่*', ['หน่วยที่'], 1);
  const unitNameIdx = getColumnIndex('ชื่อหน่วยเลือกตั้ง*', ['ชื่อหน่วย'], 2);
  const locationIdx = getColumnIndex('สถานที่', [], 3);
  const districtIdx = getColumnIndex('อำเภอ*', ['อำเภอ'], 4);
  const subdistrictIdx = getColumnIndex('ตำบล*', ['ตำบล'], 5);
  const villageIdx = getColumnIndex('หมู่*', ['หมู่'], 6);
  const coordinatesIdx = getColumnIndex('พิกัด', [], 13);
  const googleMapLinkIdx = getColumnIndex('google,map*', ['google map', 'googlemap'], 14);
  const responsiblePersonIdx = getColumnIndex('ผู้รับผิดชอบหน่วย*', ['ผู้รับผิดชอบ'], 15);
  const contactNumberIdx = getColumnIndex('หมายเลขติดต่อ*', ['หมายเลขติดต่อ'], 16);
  
  // Debug: Log headers and found indices for all districts
  console.log(`[District ${electionDistrict}] Headers (${headers.length}):`, headers);
  console.log(`[District ${electionDistrict}] Column indices:`, {
    unitNumber: unitNumberIdx,
    unitName: unitNameIdx,
    location: locationIdx,
    district: districtIdx,
    subdistrict: subdistrictIdx,
    village: villageIdx,
    coordinates: coordinatesIdx,
    googleMapLink: googleMapLinkIdx,
    responsiblePerson: responsiblePersonIdx,
    contactNumber: contactNumberIdx,
  });
  
  // Verify that all required columns are found
  const requiredColumns = [
    { name: 'หน่วยที่เลือกตั้งที่*', idx: unitNumberIdx },
    { name: 'ชื่อหน่วยเลือกตั้ง*', idx: unitNameIdx },
    { name: 'สถานที่', idx: locationIdx },
    { name: 'อำเภอ*', idx: districtIdx },
    { name: 'ตำบล*', idx: subdistrictIdx },
    { name: 'หมู่*', idx: villageIdx },
    { name: 'พิกัด', idx: coordinatesIdx },
    { name: 'google,map*', idx: googleMapLinkIdx },
    { name: 'ผู้รับผิดชอบหน่วย*', idx: responsiblePersonIdx },
    { name: 'หมายเลขติดต่อ*', idx: contactNumberIdx },
  ];
  
  const missingColumns = requiredColumns.filter(col => col.idx < 0);
  if (missingColumns.length > 0) {
    console.warn(`[District ${electionDistrict}] Missing columns:`, missingColumns.map(col => col.name));
  }
  
  // Debug: Verify that district, subdistrict, and village columns are correct
  if (districtIdx >= 0) {
    console.log(`[District ${electionDistrict}] อำเภอ column: index=${districtIdx}, header="${headers[districtIdx]}"`);
  } else {
    console.warn(`[District ${electionDistrict}] อำเภอ column not found`);
  }
  if (subdistrictIdx >= 0) {
    console.log(`[District ${electionDistrict}] ตำบล column: index=${subdistrictIdx}, header="${headers[subdistrictIdx]}"`);
  } else {
    console.warn(`[District ${electionDistrict}] ตำบล column not found`);
  }
  if (villageIdx >= 0) {
    console.log(`[District ${electionDistrict}] หมู่ column: index=${villageIdx}, header="${headers[villageIdx]}"`);
  } else {
    console.warn(`[District ${electionDistrict}] หมู่ column not found`);
  }
  
  const units: ElectionUnit[] = [];
  let skippedCount = 0;
  let skippedReasons: Record<string, number> = {};
  
  rows.forEach((row: any, rowIndex: number) => {
    const getCellValue = (index: number): string => {
      if (index < 0) return '';
      if (!row.c || index >= row.c.length) return '';
      
      // Handle null cells (empty cells in Google Sheets are represented as null)
      const cell = row.c[index];
      if (cell === null || cell === undefined) return '';
      
      // Google Sheets JSON API structure:
      // cell.v = raw value (number, string, date object, etc.)
      // cell.f = formatted value (string representation)
      
      // Priority: use formatted value (f) if available, otherwise raw value (v)
      if (cell.f !== null && cell.f !== undefined && String(cell.f).trim() !== '') {
        return String(cell.f);
      }
      
      if (cell.v !== null && cell.v !== undefined) {
        // Handle different value types
        if (typeof cell.v === 'number') {
          return String(cell.v);
        }
        
        if (typeof cell.v === 'string') {
          return cell.v;
        }
        
        if (typeof cell.v === 'boolean') {
          return String(cell.v);
        }
        
        if (typeof cell.v === 'object' && cell.v !== null) {
          // Date object - Google Sheets returns date as object with getTime method
          if (typeof cell.v.getTime === 'function') {
            const date = new Date(cell.v);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
          // Try to convert to string
          try {
            return String(cell.v);
          } catch {
            return '';
          }
        }
        
        // Fallback
        return String(cell.v);
      }
      
      return '';
    };
    
    const unitNumber = getCellValue(unitNumberIdx);
    const unitName = getCellValue(unitNameIdx);
    
    // Debug: Log first few rows to see what we're getting
    if (rowIndex < 3 || (electionDistrict === '3' && rowIndex < 10)) {
      console.log(`[District ${electionDistrict}] Row ${rowIndex}:`, {
        unitNumberIdx,
        unitNameIdx,
        unitNumber,
        unitName,
        rawCell0: row.c?.[0],
        rawCell1: row.c?.[1],
        cell0: row.c?.[0] ? { v: row.c[0].v, f: row.c[0].f, type: typeof row.c[0].v } : null,
        cell1: row.c?.[1] ? { v: row.c[1].v, f: row.c[1].f, type: typeof row.c[1].v } : null,
        header0: headers[0],
        header1: headers[1],
        allCells: row.c?.slice(0, 10).map((c: any, i: number) => ({
          index: i,
          header: headers[i],
          v: c?.v,
          f: c?.f,
          type: typeof c?.v
        }))
      });
    }
    
    // Skip if no unit number or name (after trimming)
    const trimmedUnitNumber = unitNumber.trim();
    const trimmedUnitName = unitName.trim();
    
    // Skip empty rows
    if (!trimmedUnitNumber && !trimmedUnitName) {
      skippedCount++;
      skippedReasons['empty_row'] = (skippedReasons['empty_row'] || 0) + 1;
      if (rowIndex < 3) {
        console.log(`[District ${electionDistrict}] Row ${rowIndex} skipped: empty row`);
      }
      return;
    }
    
    // More lenient: only require unitNumber, unitName can be empty
    // BUT: For district 3, be even more lenient - check if unitNumber might be in a different column
    if (!trimmedUnitNumber) {
      // For district 3, try to find unitNumber in other columns if not in expected position
      if (electionDistrict === '3' && row.c && row.c.length > 0) {
        // Check if first column might be unitNumber (even if header doesn't match)
        const firstCellValue = getCellValue(0);
        const firstCellAsNumber = parseInt(firstCellValue);
        if (!isNaN(firstCellAsNumber) && firstCellAsNumber > 0 && firstCellAsNumber < 1000) {
          // This might be a unit number in the first column
          console.log(`[District 3] Row ${rowIndex}: Found potential unitNumber in first column: ${firstCellValue}`);
          // Don't skip - continue with this as unitNumber
          // We'll handle this below by using firstCellValue as unitNumber
        } else {
          skippedCount++;
          skippedReasons['missing_unitNumber'] = (skippedReasons['missing_unitNumber'] || 0) + 1;
          if (rowIndex < 10) {
            console.log(`[District ${electionDistrict}] Row ${rowIndex} skipped: missing unitNumber`, {
              unitNumber: trimmedUnitNumber,
              unitName: trimmedUnitName,
              firstCellValue: firstCellValue,
              allCells: row.c?.slice(0, 6).map((c: any, i: number) => ({
                index: i,
                header: headers[i],
                v: c?.v,
                f: c?.f
              }))
            });
          }
          return;
        }
      } else {
      skippedCount++;
      skippedReasons['missing_unitNumber'] = (skippedReasons['missing_unitNumber'] || 0) + 1;
      if (rowIndex < 3 || electionDistrict === '3') {
        console.log(`[District ${electionDistrict}] Row ${rowIndex} skipped: missing unitNumber`, {
          unitNumber: trimmedUnitNumber,
          unitName: trimmedUnitName,
          allCells: row.c?.slice(0, 6).map((c: any, i: number) => ({
            index: i,
            header: headers[i],
            v: c?.v,
            f: c?.f
          }))
        });
      }
      return;
      }
    }
    
    // If unitName is empty but unitNumber exists, use a default name
    const finalUnitName = trimmedUnitName || `หน่วยที่ ${trimmedUnitNumber}`;
    
    // Skip if values match headers exactly (indicating we're reading header row)
    // This should not happen with Google Sheets JSON API, but check anyway
    const headerUnitNumber = headers[unitNumberIdx]?.trim() || '';
    const headerUnitName = headers[unitNameIdx]?.trim() || '';
    
    // Get district, subdistrict, village values for header row detection
    const districtValue = districtIdx >= 0 ? getCellValue(districtIdx).trim() : '';
    const subdistrictValue = subdistrictIdx >= 0 ? getCellValue(subdistrictIdx).trim() : '';
    const villageValue = villageIdx >= 0 ? getCellValue(villageIdx).trim() : '';
    
    // More strict check: Only skip if BOTH unitNumber AND unitName match their EXACT header positions
    // This is a strong indicator of a header row
    const unitNumberMatchesExactHeader = trimmedUnitNumber === headerUnitNumber && headerUnitNumber !== '';
    const unitNameMatchesExactHeader = finalUnitName === headerUnitName && headerUnitName !== '';
    
    // Also check if unitNumber matches a known header name pattern (like "หน่วยที่เลือกตั้งที่*")
    // BUT: Don't skip if unitNumber is a number (like "1", "2", etc.)
    const isNumericUnitNumber = /^\d+$/.test(trimmedUnitNumber);
    const unitNumberMatchesKnownHeader = !isNumericUnitNumber && (
      trimmedUnitNumber === 'หน่วยที่เลือกตั้งที่*' || 
      trimmedUnitNumber === 'หน่วยที่เลือกตั้งที่' ||
      trimmedUnitNumber.includes('หน่วยที่เลือกตั้ง')
    );
    
    // Only skip if it's clearly a header row:
    // 1. Both unitNumber and unitName match their exact header positions, OR
    // 2. unitNumber matches a known header pattern (but not a number) AND unitName matches its header position
    if ((unitNumberMatchesExactHeader && unitNameMatchesExactHeader) ||
        (unitNumberMatchesKnownHeader && unitNameMatchesExactHeader)) {
      skippedCount++;
      skippedReasons['unitNumber_unitName_match_headers'] = (skippedReasons['unitNumber_unitName_match_headers'] || 0) + 1;
      if (rowIndex < 5 || electionDistrict === '3') {
        console.warn(`[District ${electionDistrict}] Skipping row ${rowIndex} - matches header row pattern`, {
          unitNumber: trimmedUnitNumber,
          unitName: finalUnitName,
          headerUnitNumber,
          headerUnitName,
          unitNumberMatchesExactHeader,
          unitNameMatchesExactHeader,
          unitNumberMatchesKnownHeader,
          isNumericUnitNumber
        });
      }
      return;
    }
    
    // Debug logging for district 3 - log first few rows that are NOT skipped
    if (electionDistrict === '3' && rowIndex < 5) {
      console.log(`[District 3] Row ${rowIndex} NOT skipped:`, {
        unitNumber: trimmedUnitNumber,
        unitName: finalUnitName,
        headerUnitNumber,
        headerUnitName,
        unitNumberMatchesExactHeader,
        unitNameMatchesExactHeader,
        unitNumberMatchesKnownHeader,
        isNumericUnitNumber
      });
    }
    
    const coordinates = getCellValue(coordinatesIdx);
    
    // Debug logging for district 3 and 4 - check if coordinates index is correct
    if ((electionDistrict === '3' || electionDistrict === '4') && rowIndex < 3) {
      console.log(`[District ${electionDistrict}] Row ${rowIndex} coordinates debug:`, {
        coordinatesIdx,
        coordinatesHeader: headers[coordinatesIdx],
        coordinatesValue: coordinates,
        unitNumber,
        allCellsAroundCoordinates: row.c?.slice(Math.max(0, coordinatesIdx - 2), coordinatesIdx + 3).map((c: any, i: number) => ({
          index: coordinatesIdx - 2 + i,
          header: headers[coordinatesIdx - 2 + i],
          v: c?.v,
          f: c?.f
        }))
      });
    }
    
    // Debug logging for district 3 and 4
    if ((electionDistrict === '3' || electionDistrict === '4') && coordinates && rowIndex < 3) {
      console.log(`[District ${electionDistrict}] Unit ${unitNumber}: coordinates="${coordinates}"`);
    }
    
    const coords = parseCoordinates(coordinates);
    
    // Debug logging for district 3 and 4 if parse failed
    if ((electionDistrict === '3' || electionDistrict === '4') && coordinates && !coords && rowIndex < 3) {
      console.warn(`[District ${electionDistrict}] Failed to parse coordinates for unit ${unitNumber}: "${coordinates}"`, {
        coordinatesIdx,
        coordinatesHeader: headers[coordinatesIdx],
        isNumeric: !isNaN(Number(coordinates))
      });
    }
    
    // Log for debugging if column not found
    if (unitNumberIdx < 0) console.warn('Column "หน่วยที่เลือกตั้งที่*" not found. Headers:', headers);
    if (unitNameIdx < 0) console.warn('Column "ชื่อหน่วยเลือกตั้ง*" not found. Headers:', headers);
    if (coordinatesIdx < 0 && (electionDistrict === '3' || electionDistrict === '4')) {
      console.warn(`[District ${electionDistrict}] Column "พิกัด" not found. Headers:`, headers);
    }
    
    // Debug: Log village values for first few rows to verify column is correct
    if (rowIndex < 3) {
      console.log(`[District ${electionDistrict}] Row ${rowIndex} village debug:`, {
        villageIdx,
        villageHeader: villageIdx >= 0 ? headers[villageIdx] : 'NOT FOUND',
        villageValue,
        unitNumber,
        allCellsAroundVillage: row.c?.slice(Math.max(0, villageIdx - 2), villageIdx + 3).map((c: any, i: number) => ({
          index: villageIdx - 2 + i,
          header: headers[villageIdx - 2 + i],
          v: c?.v,
          f: c?.f
        }))
      });
    }
    
    // Debug logging for district 3 to verify data mapping
    // Log row 13 (index 13, which is row 14 in the sheet) and first few rows
    if (electionDistrict === '3' && (rowIndex < 3 || rowIndex === 13)) {
      console.log(`[District 3] Row ${rowIndex} (Sheet row ${rowIndex + 2}) data mapping:`, {
        unitNumber: trimmedUnitNumber,
        unitName: finalUnitName,
        location: locationIdx >= 0 ? getCellValue(locationIdx).trim() : '',
        district: districtIdx >= 0 ? getCellValue(districtIdx).trim() : '',
        subdistrict: subdistrictIdx >= 0 ? getCellValue(subdistrictIdx).trim() : '',
        village: villageValue,
        responsiblePerson: responsiblePersonIdx >= 0 ? getCellValue(responsiblePersonIdx).trim() : '',
        contactNumber: contactNumberIdx >= 0 ? getCellValue(contactNumberIdx).trim() : '',
        indices: {
          unitNumber: unitNumberIdx,
          unitName: unitNameIdx,
          location: locationIdx,
          district: districtIdx,
          subdistrict: subdistrictIdx,
          village: villageIdx,
          responsiblePerson: responsiblePersonIdx,
          contactNumber: contactNumberIdx
        },
        // Log all cells around responsiblePerson and contactNumber columns
        allCellsAroundResponsiblePerson: row.c?.slice(Math.max(0, responsiblePersonIdx - 2), responsiblePersonIdx + 3).map((c: any, i: number) => ({
          index: responsiblePersonIdx - 2 + i,
          header: headers[responsiblePersonIdx - 2 + i],
          v: c?.v,
          f: c?.f
        }))
      });
    }
    
    units.push({
      unitNumber: trimmedUnitNumber,
      unitName: finalUnitName,
      location: locationIdx >= 0 ? getCellValue(locationIdx).trim() : '',
      district: districtIdx >= 0 ? getCellValue(districtIdx).trim() : '',
      subdistrict: subdistrictIdx >= 0 ? getCellValue(subdistrictIdx).trim() : '',
      village: villageValue,
      googleMapLink: googleMapLinkIdx >= 0 ? getCellValue(googleMapLinkIdx).trim() : '',
      responsiblePerson: responsiblePersonIdx >= 0 ? getCellValue(responsiblePersonIdx).trim() : '',
      contactNumber: contactNumberIdx >= 0 ? getCellValue(contactNumberIdx).trim() : '',
      electionDistrict: electionDistrict,
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
    });
  });
  
  // Log summary for each district
  console.log(`[District ${electionDistrict}] Parse summary:`, {
    totalRows: rows.length,
    parsedUnits: units.length,
    skippedRows: skippedCount,
    skippedReasons: skippedReasons,
    skippedPercentage: rows.length > 0 ? ((skippedCount / rows.length) * 100).toFixed(1) + '%' : '0%'
  });
  
  // Warn if too many rows are being skipped (more than 20%)
  if (rows.length > 0 && (skippedCount / rows.length) > 0.2) {
    console.warn(`[District ${electionDistrict}] WARNING: ${((skippedCount / rows.length) * 100).toFixed(1)}% of rows were skipped!`, skippedReasons);
  }
  
  // Extra debug for district 3
  if (electionDistrict === '3') {
    console.log(`[District 3] First 3 parsed units:`, units.slice(0, 3).map(u => ({
      unitNumber: u.unitNumber,
      unitName: u.unitName,
      district: u.district,
      subdistrict: u.subdistrict
    })));
    
    // Check for missing subdistricts: บางกรวย, วัดชลอ, บางไผ่
    const subdistricts = units.map(u => u.subdistrict).filter(s => s);
    const uniqueSubdistricts = [...new Set(subdistricts)];
    console.log(`[District 3] All unique subdistricts found (${uniqueSubdistricts.length}):`, uniqueSubdistricts);
    
    const missingSubdistricts = ['บางกรวย', 'วัดชลอ', 'บางไผ่'].filter(s => !uniqueSubdistricts.includes(s));
    if (missingSubdistricts.length > 0) {
      console.warn(`[District 3] Missing subdistricts:`, missingSubdistricts);
      
      // Check if these subdistricts exist in the raw data but were skipped
      console.log(`[District 3] Checking raw rows for missing subdistricts...`);
      rows.forEach((row: any, rowIndex: number) => {
        const subdistrictValue = subdistrictIdx >= 0 && row.c?.[subdistrictIdx] ? 
          (row.c[subdistrictIdx].f || row.c[subdistrictIdx].v || '') : '';
        if (missingSubdistricts.some(ms => subdistrictValue && subdistrictValue.includes(ms))) {
          console.log(`[District 3] Found missing subdistrict in row ${rowIndex}:`, {
            subdistrict: subdistrictValue,
            unitNumber: row.c?.[unitNumberIdx]?.f || row.c?.[unitNumberIdx]?.v || '',
            unitName: row.c?.[unitNameIdx]?.f || row.c?.[unitNameIdx]?.v || '',
            allCells: row.c?.slice(0, 6).map((c: any, i: number) => ({
              index: i,
              header: headers[i],
              v: c?.v,
              f: c?.f
            }))
          });
        }
      });
    } else {
      console.log(`[District 3] All expected subdistricts found!`);
    }
    
    // Count units per subdistrict
    const subdistrictCounts: Record<string, number> = {};
    units.forEach(u => {
      if (u.subdistrict) {
        subdistrictCounts[u.subdistrict] = (subdistrictCounts[u.subdistrict] || 0) + 1;
      }
    });
    console.log(`[District 3] Units per subdistrict:`, subdistrictCounts);
  }
  
  return units;
}

// Helper function to parse coordinates
function parseCoordinates(coordString: string): { lat: number; lng: number } | null {
  if (!coordString || coordString.trim() === '') {
    return null;
  }
  
  // Remove quotes if present
  let cleaned = coordString.replace(/^["']|["']$/g, '').trim();
  
  // Try to parse DMS format (Degrees, Minutes, Seconds): "13°56'31.5"N 100°31'25.6"E"
  // Pattern: DD°MM'SS.S"N DDD°MM'SS.S"E
  const dmsMatch = cleaned.match(/(\d+)°(\d+)'([\d.]+)"([NS])\s+(\d+)°(\d+)'([\d.]+)"([EW])/i);
  if (dmsMatch) {
    const latDeg = parseInt(dmsMatch[1]);
    const latMin = parseInt(dmsMatch[2]);
    const latSec = parseFloat(dmsMatch[3]);
    const latDir = dmsMatch[4].toUpperCase();
    const lngDeg = parseInt(dmsMatch[5]);
    const lngMin = parseInt(dmsMatch[6]);
    const lngSec = parseFloat(dmsMatch[7]);
    const lngDir = dmsMatch[8].toUpperCase();
    
    // Convert DMS to decimal degrees
    let lat = latDeg + (latMin / 60) + (latSec / 3600);
    let lng = lngDeg + (lngMin / 60) + (lngSec / 3600);
    
    // Apply direction (S and W are negative)
    if (latDir === 'S') lat = -lat;
    if (lngDir === 'W') lng = -lng;
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  
  // Try to parse decimal degrees format: "13.942083, 100.523778" or "13.942083,100.523778"
  const coordMatch = cleaned.match(/(\d+\.?\d*)\s*[,，]\s*(\d+\.?\d*)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  
  // Fallback to original parsing
  const parts = cleaned.split(/[,，]/);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  
  return null;
}

// Convert parsed JSON data to CSV-like format for existing parser
function convertJSONToCSV(data: string[][]): string {
  return data.map(row => {
    return row.map(cell => {
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',');
  }).join('\n');
}

// Hook to fetch election units directly from Google Sheets (client-side)
export function useElectionUnits(): {
  units: ElectionUnit[];
  loading: boolean;
  error: Error | null;
} {
  const [units, setUnits] = useState<ElectionUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUnits() {
      try {
        setLoading(true);
        setError(null);
        
        const allUnits: ElectionUnit[] = [];
        const errors: string[] = [];
        
        // Fetch data from all 8 districts
        const fetchPromises = Object.entries(SHEET_GIDS).map(async ([district, gid]) => {
          console.log(`[District ${district}] Starting fetch for GID ${gid}...`);
          try {
            // Use JSON API for all districts (including district 3)
            // Google Sheets gviz/tq API may have a default row limit (~100-500 rows)
            // Try using tq query parameter to explicitly request all rows
            // Format: tq=select * (URL encoded as select%20*)
            const jsonUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&tq=select%20*&gid=${gid}`;
            
            // Alternative: If tq doesn't work, try with range parameter
            // const jsonUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&range=A1:Z10000&gid=${gid}`;
            
            console.log(`[District ${district}] Fetching from: ${jsonUrl}`);
            const response = await fetch(jsonUrl, {
              cache: 'no-store',
              mode: 'cors',
            });
            
            if (!response.ok) {
              console.error(`[District ${district}] HTTP error: ${response.status} ${response.statusText}`);
              errors.push(`District ${district}: HTTP ${response.status}`);
              return [];
            }
            
            const jsonText = await response.text();
            console.log(`[District ${district}] Received response (${jsonText.length} chars)`);
            
            // Log number of rows received from API (before parsing)
            let apiRowCount = 0;
            try {
              const jsonMatch = jsonText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
              if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[1]);
                if (jsonData.table && jsonData.table.rows) {
                  apiRowCount = jsonData.table.rows.length;
                  console.log(`[District ${district}] API returned ${apiRowCount} rows`);
                  
                  // Warn if we got less than 200 rows for district 3 (should have more)
                  if (district === '3' && apiRowCount < 200) {
                    console.warn(`[District 3] WARNING: Only received ${apiRowCount} rows from API. Expected more. This may indicate a row limit issue.`);
                    console.warn(`[District 3] Consider using CSV export or Google Sheets API v4 for full data.`);
                  }
                }
              }
            } catch (e) {
              // Ignore parsing errors here, will be caught later
            }
            
            if (!jsonText || jsonText.trim().length === 0) {
              console.error(`[District ${district}] Empty response`);
              errors.push(`District ${district}: Empty response`);
              return [];
            }
            
            if (jsonText.trim().startsWith('<!DOCTYPE') || jsonText.trim().startsWith('<html')) {
              console.error(`[District ${district}] Received HTML instead of JSON - sheet may not be publicly accessible`);
              errors.push(`District ${district}: Sheet not publicly accessible`);
              return [];
            }
            
            try {
              let districtUnits: ElectionUnit[] = [];
              
              // Use JSON API for all districts (including district 3)
              // This should include all rows from the sheet
              console.log(`[District ${district}] Starting to parse JSON response (${jsonText.length} chars)...`);
              
              try {
                districtUnits = parseGoogleSheetsToElectionUnits(jsonText, district);
                
                // For district 3, if we got less than 200 units, try CSV export as fallback
                // CSV export doesn't have row limits like JSON API
                if (district === '3' && districtUnits.length < 200 && apiRowCount < 200) {
                  console.warn(`[District 3] Only got ${districtUnits.length} units from JSON API. Trying CSV export as fallback...`);
                  
                  try {
                    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
                    const csvResponse = await fetch(csvUrl, {
                      cache: 'no-store',
                      mode: 'cors',
                    });
                    
                    if (csvResponse.ok) {
                      const csvText = await csvResponse.text();
                      console.log(`[District 3] CSV export returned ${csvText.split('\n').length} lines`);
                      
                      // Parse CSV using existing parser
                      const csvUnits = parseElectionUnitsFromCSV(csvText, district, 1); // Skip 1 header row
                      
                      if (csvUnits.length > districtUnits.length) {
                        console.log(`[District 3] CSV export gave us ${csvUnits.length} units (vs ${districtUnits.length} from JSON). Using CSV data.`);
                        districtUnits = csvUnits;
                      } else {
                        console.log(`[District 3] CSV export gave us ${csvUnits.length} units (same or less than JSON). Keeping JSON data.`);
                      }
                    }
                  } catch (csvError) {
                    console.warn(`[District 3] CSV fallback failed:`, csvError);
                    // Continue with JSON data
                  }
                }
                
                // For districts with 0 units, try CSV export as fallback
                if (districtUnits.length === 0) {
                  console.warn(`[District ${district}] WARNING: No units parsed from JSON! Trying CSV export as fallback...`);
                  
                  try {
                    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
                    const csvResponse = await fetch(csvUrl, {
                      cache: 'no-store',
                      mode: 'cors',
                    });
                    
                    if (csvResponse.ok) {
                      const csvText = await csvResponse.text();
                      console.log(`[District ${district}] CSV export returned ${csvText.split('\n').length} lines`);
                      console.log(`[District ${district}] CSV preview (first 500 chars):`, csvText.substring(0, 500));
                      
                      // Parse CSV using existing parser
                      const csvUnits = parseElectionUnitsFromCSV(csvText, district, 1); // Skip 1 header row
                      
                      if (csvUnits.length > 0) {
                        console.log(`[District ${district}] CSV export gave us ${csvUnits.length} units. Using CSV data.`);
                        districtUnits = csvUnits;
                      } else {
                        console.warn(`[District ${district}] CSV export also returned 0 units. This may indicate a data structure issue.`);
                      }
                    } else {
                      console.warn(`[District ${district}] CSV export failed with status: ${csvResponse.status}`);
                    }
                  } catch (csvError) {
                    console.warn(`[District ${district}] CSV fallback failed:`, csvError);
                  }
                }
                
                // Log summary for all districts
                if (district === '3') {
                  const subdistricts = districtUnits.map(u => u.subdistrict).filter(s => s);
                  const uniqueSubdistricts = [...new Set(subdistricts)];
                  console.log(`[District 3] Final parsed ${districtUnits.length} units, ${uniqueSubdistricts.length} unique subdistricts:`, uniqueSubdistricts);
                } else {
                  // Log for other districts to verify they're being parsed correctly
                  console.log(`[District ${district}] Successfully parsed ${districtUnits.length} units`);
                  if (districtUnits.length === 0) {
                    console.error(`[District ${district}] ERROR: No units parsed after all attempts!`);
                    console.error(`[District ${district}] JSON response length: ${jsonText.length} characters`);
                    console.error(`[District ${district}] JSON preview (first 1000 chars):`, jsonText.substring(0, 1000));
                    console.error(`[District ${district}] API returned ${apiRowCount} rows`);
                    
                    // Try to parse JSON structure to see what we got
                    try {
                      const jsonMatch = jsonText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
                      if (jsonMatch) {
                        const jsonData = JSON.parse(jsonMatch[1]);
                        if (jsonData.table && jsonData.table.cols) {
                          const headers = jsonData.table.cols.map((col: any) => col.label || '');
                          console.error(`[District ${district}] Headers found (${headers.length}):`, headers);
                        }
                        if (jsonData.table && jsonData.table.rows) {
                          console.error(`[District ${district}] First 3 rows:`, jsonData.table.rows.slice(0, 3).map((row: any, idx: number) => ({
                            rowIndex: idx,
                            cells: row.c?.slice(0, 10).map((c: any, i: number) => ({
                              index: i,
                              v: c?.v,
                              f: c?.f
                            }))
                          })));
                        }
                      }
                    } catch (debugError) {
                      console.error(`[District ${district}] Failed to debug JSON structure:`, debugError);
                    }
                  } else {
                    // Log sample units
                    const sampleUnits = districtUnits.slice(0, 3).map(u => ({
                      unitNumber: u.unitNumber,
                      unitName: u.unitName.substring(0, 30),
                      subdistrict: u.subdistrict
                    }));
                    console.log(`[District ${district}] Sample units:`, sampleUnits);
                  }
                }
              } catch (parseError) {
                const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
                const parseErrorStack = parseError instanceof Error ? parseError.stack : undefined;
                console.error(`[District ${district}] Parse error in parseGoogleSheetsToElectionUnits:`, parseErrorMessage);
                if (parseErrorStack) {
                  console.error(`[District ${district}] Parse error stack:`, parseErrorStack);
                }
                throw parseError; // Re-throw to be caught by outer catch
              }
              
              console.log(`[District ${district}] Returning ${districtUnits.length} units`);
              return districtUnits;
            } catch (parseError) {
              const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
              const parseErrorStack = parseError instanceof Error ? parseError.stack : undefined;
              console.error(`[District ${district}] Parse error:`, parseErrorMessage);
              if (parseErrorStack) {
                console.error(`[District ${district}] Parse error stack:`, parseErrorStack);
              }
              errors.push(`District ${district}: Parse error - ${parseErrorMessage}`);
              return [];
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            errors.push(`District ${district}: ${errorMessage}`);
            return [];
          }
        });
        
        const results = await Promise.all(fetchPromises);
        
        // Log summary for each district
        results.forEach((districtUnits, index) => {
          const district = Object.keys(SHEET_GIDS)[index];
          console.log(`[District ${district}] Fetched ${districtUnits.length} units`);
          
          if (districtUnits.length === 0) {
            console.warn(`[District ${district}] WARNING: No units fetched! This district may have parsing issues.`);
          } else {
            // Log sample units for verification
            const sampleUnits = districtUnits.slice(0, 2).map(u => ({
              unitNumber: u.unitNumber,
              unitName: u.unitName.substring(0, 30),
              subdistrict: u.subdistrict
            }));
            console.log(`[District ${district}] Sample units:`, sampleUnits);
          }
          
          allUnits.push(...districtUnits);
        });
        
        console.log(`[Total] Fetched ${allUnits.length} units from all districts`);
        
        // Verify all districts are present
        const districtsPresent = results.map((units, index) => ({
          district: Object.keys(SHEET_GIDS)[index],
          count: units.length
        }));
        console.log(`[Summary] Units per district:`, districtsPresent);
        
        const missingDistricts = districtsPresent.filter(d => d.count === 0);
        if (missingDistricts.length > 0) {
          console.error(`[ERROR] Missing districts:`, missingDistricts.map(d => d.district));
        }
        
        if (allUnits.length === 0) {
          const errorSummary = errors.length > 0 ? `\nErrors: ${errors.join('; ')}` : '';
          throw new Error(`No election units found.${errorSummary}\n\nPlease check:\n1. Google Sheet is shared as "Anyone with the link can view"\n2. Sheet IDs and GIDs are correct`);
        }
        
        // Sort by unitNumber
        allUnits.sort((a, b) => {
          const numA = parseInt(a.unitNumber) || 0;
          const numB = parseInt(b.unitNumber) || 0;
          return numA - numB;
        });
        
        setUnits(allUnits);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(new Error(errorMessage));
        console.error('Error fetching election units:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUnits();
  }, []);

  return { units, loading, error };
}

// For backward compatibility, export empty array (components should use useElectionUnits hook)
export const electionUnits: ElectionUnit[] = [];
