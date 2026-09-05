import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads directory (stored in Git repository)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = file.name ? path.extname(file.name) : '';
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    await fs.writeFile(filePath, buffer);
    const gitHubLocalUrl = `/uploads/${safeName}`;

    // Try uploading to Cloudinary if account active
    try {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'thelifeholics',
              resource_type: 'auto',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(buffer);
        });

        if (result && result.secure_url) {
          return NextResponse.json({
            url: result.secure_url,
            public_id: result.public_id,
            fallbackUrl: gitHubLocalUrl,
          });
        }
      }
    } catch (cloudinaryError: any) {
      console.warn('Cloudinary upload limit reached or failed, falling back to GitHub/Local path:', cloudinaryError.message || cloudinaryError);
    }

    // Return GitHub repo local URL if Cloudinary limit reached
    return NextResponse.json({
      url: gitHubLocalUrl,
      public_id: safeName,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

