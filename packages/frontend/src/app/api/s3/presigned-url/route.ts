import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl, getMultiplePresignedUrls } from '@/lib/s3-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, keys, expiresIn = 3600 } = body;

    // Generate single URL
    if (key) {
      const presignedUrl = await getPresignedUrl(key, expiresIn);
      return NextResponse.json({ url: presignedUrl });
    }

    // Generate multiple URLs
    if (keys && Array.isArray(keys)) {
      const urls = await getMultiplePresignedUrls(keys, expiresIn);
      return NextResponse.json({ urls });
    }

    return NextResponse.json(
      { error: 'Either "key" or "keys" array is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600');

    if (!key) {
      return NextResponse.json(
        { error: 'Key parameter is required' },
        { status: 400 }
      );
    }

    const presignedUrl = await getPresignedUrl(key, expiresIn);
    return NextResponse.json({ url: presignedUrl });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
} 