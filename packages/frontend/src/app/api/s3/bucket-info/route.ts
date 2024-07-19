import { NextResponse } from 'next/server';
import { Resource } from 'sst';

export async function GET() {
  try {
    return NextResponse.json({
      bucketName: Resource.MediaBucket.name,
      region: process.env.AWS_REGION || 'us-east-1'
    });
  } catch (error) {
    console.error('Error getting bucket info:', error);
    return NextResponse.json(
      { error: 'Failed to get bucket info' },
      { status: 500 }
    );
  }
} 