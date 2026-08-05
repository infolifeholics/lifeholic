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

    const fileType = file.type || '';
    const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';
    const isVideo = fileType.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv'].includes(ext || '');
    const isAudio = fileType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '');
    const isImage = fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');

    let resourceType = 'auto';
    if (isVideo || isAudio) {
      resourceType = 'video';
    } else if (isImage) {
      resourceType = 'image';
    }

    let uploadResult;

    if (isVideo || isAudio) {
      // Use upload_large to support chunked uploads for large video/audio files
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `${Date.now()}-${file.name}`);
      await fs.writeFile(tempFilePath, buffer);

      try {
        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_large(
            tempFilePath,
            {
              folder: 'thelifeholics',
              resource_type: 'video',
              chunk_size: 6000000, // 6MB chunks
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
        });
      } finally {
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {});
      }
    } else {
      // Use upload_stream for images
      uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'thelifeholics',
            resource_type: resourceType as any,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });
    }

    return NextResponse.json({
      url: (uploadResult as any).secure_url,
      public_id: (uploadResult as any).public_id,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

