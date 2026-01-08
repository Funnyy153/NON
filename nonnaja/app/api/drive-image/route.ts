import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // ลองใช้ Google Drive API ถ้ามี credentials
    const serviceAccountKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      try {
        // ใช้ Service Account สำหรับ private files
        const auth = new google.auth.GoogleAuth({
          keyFile: serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });
        
        // ดึงไฟล์เป็น stream
        const fileResponse = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );

        const imageBuffer = Buffer.from(fileResponse.data as ArrayBuffer);
        
        // ดึง mime type
        const fileMetadata = await drive.files.get({
          fileId,
          fields: 'mimeType',
        });

        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': fileMetadata.data.mimeType || 'image/jpeg',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (apiError) {
        console.error('Google Drive API error:', apiError);
        // ถ้า API ไม่สำเร็จ ให้ลองวิธีอื่นต่อ
      }
    }

    // วิธีที่ 1: ใช้ direct image URL (สำหรับ files ที่ share เป็น "Anyone with the link")
    const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    
    // ดึงรูปภาพจาก Google Drive
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!imageResponse.ok) {
      // ถ้าไม่สามารถเข้าถึงได้ ให้ลองใช้ thumbnail URL
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      const thumbnailResponse = await fetch(thumbnailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (thumbnailResponse.ok) {
        const imageBuffer = await thumbnailResponse.arrayBuffer();
        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': thumbnailResponse.headers.get('Content-Type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // ถ้ายังไม่ได้ ให้ return error
      return NextResponse.json(
        { 
          error: 'Cannot access Google Drive file. Please make sure the file is shared with "Anyone with the link" or set up Google Drive API credentials. See GOOGLE_DRIVE_SETUP.md for instructions.' 
        },
        { status: 403 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching Google Drive image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

