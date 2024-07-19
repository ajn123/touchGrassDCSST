import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Resource } from 'sst';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${timestamp}-${sanitizedFilename}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Get bucket name from SST Resource
    const bucketName = Resource.MediaBucket.name;
    
    console.log('Uploading to bucket:', bucketName);
    console.log('File key:', key);
    console.log('File size:', file.size);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      key: key,
      filename: file.name,
      size: file.size,
      type: file.type,
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 