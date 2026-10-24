import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle Multipart Form Data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const strategyId = (formData.get('strategyId') as string) || 'default';
      const caption = (formData.get('caption') as string) || '';

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Ensure directory exists in public/uploads/library
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'library');
      await fs.mkdir(uploadDir, { recursive: true });

      // Clean filename
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${Date.now()}-${cleanName}`;
      const filepath = path.join(uploadDir, filename);

      await fs.writeFile(filepath, buffer);

      const publicUrl = `/uploads/library/${filename}`;

      return NextResponse.json({
        success: true,
        image: {
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          strategyId,
          url: publicUrl,
          caption: caption.trim() || file.name,
          uploadedAt: new Date().toISOString(),
        },
      });
    }

    // Handle JSON body (adding image by URL)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { strategyId, url, caption } = body;

      if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid image URL' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        image: {
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          strategyId: strategyId || 'default',
          url: url.trim(),
          caption: (caption || '').trim(),
          uploadedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling library image upload:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload image' }, { status: 500 });
  }
}
