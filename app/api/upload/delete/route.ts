import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const { url, public_id } = await req.json();
    if (!url && !public_id) {
      return NextResponse.json({ error: 'URL or public_id is required' }, { status: 400 });
    }

    if (public_id) {
      await cloudinary.uploader.destroy(public_id);
    } else if (url && url.startsWith('/uploads/')) {
      const fileName = url.replace('/uploads/', '');
      const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
      await fs.unlink(filePath).catch(() => {});
    } else if (url && url.includes('cloudinary.com')) {
      // Extract public_id from Cloudinary URL if needed
      const parts = url.split('/');
      const filenameWithExt = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      const publicId = folder && folder !== 'upload' ? `${folder}/${filenameWithExt.split('.')[0]}` : filenameWithExt.split('.')[0];
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message || 'Deletion failed' }, { status: 500 });
  }
}
