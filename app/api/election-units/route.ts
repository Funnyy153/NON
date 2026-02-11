import { NextResponse } from 'next/server';
import { parseElectionUnitsFromCSV, type ElectionUnit } from '@/app/lib/parseElectionUnits';

// Required for static export
export const dynamic = 'force-static';

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

// Helper function to parse Google Sheets JSON response
function parseGoogleSheetsJSON(jsonText: string): string[][] {
  // Google Sheets JSON format has prefix "google.visualization.Query.setResponse(" and suffix ");"
  const jsonMatch = jsonText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Google Sheets');
  }
  
  const jsonData = JSON.parse(jsonMatch[1]);
  
  if (!jsonData.table || !jsonData.table.rows) {
    return [];
  }
  
  const headers = jsonData.table.cols.map((col: any) => col.label || '');
  const rows = jsonData.table.rows;
  
  const data: string[][] = [];
  
  // Add header row
  data.push(headers);
  
  // Add data rows
  rows.forEach((row: any) => {
    const rowData: string[] = [];
    headers.forEach((header: string, index: number) => {
      const cell = row.c[index];
      let value = '';
      
      if (cell) {
        if (cell.v !== null && cell.v !== undefined) {
          if (typeof cell.v === 'object' && cell.v !== null) {
            // Date or other object type
            if (cell.v instanceof Date || (cell.v.constructor && cell.v.constructor.name === 'Date')) {
              const date = new Date(cell.v);
              if (date && !isNaN(date.getTime())) {
                value = date.toISOString();
              }
            } else {
              value = String(cell.v);
            }
          } else if (cell.f) {
            // Formatted value
            value = cell.f;
          } else {
            value = String(cell.v);
          }
        } else if (cell.f) {
          value = cell.f;
        }
      }
      
      rowData.push(value);
    });
    data.push(rowData);
  });
  
  return data;
}

// Convert parsed JSON data to CSV-like format for existing parser
function convertJSONToCSV(data: string[][]): string {
  return data.map(row => {
    return row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',');
  }).join('\n');
}

// Cache configuration
let cachedData: ElectionUnit[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchElectionUnits(): Promise<ElectionUnit[]> {
  const allUnits: ElectionUnit[] = [];
  const errors: string[] = [];
  
  // Fetch data from all 8 districts
  const fetchPromises = Object.entries(SHEET_GIDS).map(async ([district, gid]) => {
    try {
      // Use Google Sheets JSON API (gviz/tq) - more reliable than CSV export
      // Use tq query parameter to explicitly request all rows
      const jsonUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&tq=select%20*&gid=${gid}`;
      
      console.log(`[District ${district}] Fetching from: ${jsonUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per district
      
      try {
        const response = await fetch(jsonUrl, {
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
          console.error(`[District ${district}] ${errorMsg}`);
          if (errorText) {
            console.error(`[District ${district}] Response: ${errorText.substring(0, 200)}`);
          }
          errors.push(`District ${district}: ${errorMsg}`);
          return [];
        }
        
        const jsonText = await response.text();
        
        if (!jsonText || jsonText.trim().length === 0) {
          console.warn(`[District ${district}] Empty response`);
          errors.push(`District ${district}: Empty response`);
          return [];
        }
        
        // Check if response is HTML (error page) instead of JSON
        if (jsonText.trim().startsWith('<!DOCTYPE') || jsonText.trim().startsWith('<html')) {
          console.error(`[District ${district}] Received HTML instead of JSON`);
          errors.push(`District ${district}: Sheet not publicly accessible`);
          return [];
        }
        
        // Parse JSON and convert to CSV format for existing parser
        let csvContent: string;
        try {
          const data = parseGoogleSheetsJSON(jsonText);
          csvContent = convertJSONToCSV(data);
        } catch (parseError) {
          const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          console.error(`[District ${district}] JSON parse error:`, parseErrorMessage);
          console.error(`[District ${district}] JSON content preview (first 500 chars):`, jsonText.substring(0, 500));
          errors.push(`District ${district}: JSON parse error - ${parseErrorMessage}`);
          return [];
        }
        
        let units: ElectionUnit[];
        try {
          units = parseElectionUnitsFromCSV(csvContent, district, 2);
        } catch (parseError) {
          const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          console.error(`[District ${district}] CSV parse error:`, parseErrorMessage);
          console.error(`[District ${district}] CSV content preview (first 500 chars):`, csvContent.substring(0, 500));
          errors.push(`District ${district}: CSV parse error - ${parseErrorMessage}`);
          return [];
        }
        
        console.log(`[District ${district}] Successfully parsed ${units.length} units`);
        return units;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error(`[District ${district}] Request timeout`);
          errors.push(`District ${district}: Request timeout`);
        } else {
          throw fetchError;
        }
        return [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[District ${district}] Error:`, errorMessage);
      errors.push(`District ${district}: ${errorMessage}`);
      // Return empty array instead of throwing to allow other districts to load
      return [];
    }
  });
  
  const results = await Promise.all(fetchPromises);
  results.forEach(units => allUnits.push(...units));
  
  // Log summary
  const successCount = results.filter(r => r.length > 0).length;
  console.log(`Fetched ${allUnits.length} total units from ${successCount}/8 districts`);
  
  if (errors.length > 0) {
    console.warn('Errors encountered:', errors);
  }
  
  if (allUnits.length === 0) {
    const errorSummary = errors.length > 0 ? `\nErrors: ${errors.join('; ')}` : '';
    throw new Error(`No election units found.${errorSummary}\n\nPlease check:\n1. Google Sheet is shared as "Anyone with the link can view"\n2. Sheet IDs and GIDs are correct\n3. Network connection is working`);
  }
  
  // Sort by unitNumber
  allUnits.sort((a, b) => {
    const numA = parseInt(a.unitNumber) || 0;
    const numB = parseInt(b.unitNumber) || 0;
    return numA - numB;
  });
  
  return allUnits;
}

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached data');
      return NextResponse.json(cachedData);
    }
    
    console.log('Fetching fresh data from Google Sheets...');
    
    // Fetch fresh data with timeout
    let units: ElectionUnit[];
    try {
      const fetchPromise = fetchElectionUnits();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
      });
      
      units = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (fetchError) {
      const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error('Error in fetchElectionUnits:', fetchErrorMessage);
      
      // If we have cached data, return it even on error
      if (cachedData && cachedData.length > 0) {
        console.warn('Error occurred, returning stale cache');
        return NextResponse.json(cachedData);
      }
      
      throw fetchError;
    }
    
    if (!units || units.length === 0) {
      // If we have cached data, return it even if expired
      if (cachedData && cachedData.length > 0) {
        console.warn('No new data found, returning stale cache');
        return NextResponse.json(cachedData);
      }
      throw new Error('No units found. Please check Google Sheets permissions.');
    }
    
    // Update cache
    cachedData = units;
    cacheTimestamp = now;
    
    console.log(`Successfully fetched ${units.length} election units`);
    
    return NextResponse.json(units);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('=== ERROR FETCHING ELECTION UNITS ===');
    console.error('Message:', errorMessage);
    if (errorStack) {
      console.error('Stack:', errorStack);
    }
    console.error('Full error object:', error);
    console.error('=====================================');
    
    // If we have cached data, return it even on error
    if (cachedData && cachedData.length > 0) {
      console.warn('Error occurred, returning stale cache');
      return NextResponse.json(cachedData);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch election units',
        message: errorMessage,
        details: 'Please ensure the Google Sheet is shared as "Anyone with the link can view". Check server logs for more details.',
        troubleshooting: [
          '1. Open the Google Sheet and click "Share"',
          '2. Set permission to "Anyone with the link can view"',
          '3. Verify all 8 tabs (districts) are accessible',
          '4. Check server console for detailed error messages'
        ]
      },
      { status: 500 }
    );
  }
}
