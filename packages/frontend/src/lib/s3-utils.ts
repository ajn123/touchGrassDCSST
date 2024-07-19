'use server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Resource } from 'sst';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Generate a pre-signed URL for a private S3 object
 * @param key - The S3 object key (file path)
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Pre-signed URL that can be used to access the private object
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    console.log('Generating presigned URL for key:', key);
    console.log('Using bucket:', Resource.MediaBucket.name);
    console.log('Region:', process.env.AWS_REGION || 'us-east-1');
    
    const command = new GetObjectCommand({
      Bucket: Resource.MediaBucket.name,
      Key: key,
    });

    console.log('GetObjectCommand created, generating signed URL...');
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    console.log('Presigned URL generated successfully');
    return presignedUrl;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      key,
      bucket: Resource.MediaBucket.name,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate multiple pre-signed URLs for a list of objects
 * @param keys - Array of S3 object keys
 * @param expiresIn - URL expiration time in seconds
 * @returns Object with keys mapped to their pre-signed URLs
 */
export async function getMultiplePresignedUrls(
  keys: string[], 
  expiresIn: number = 3600
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  
  await Promise.all(
    keys.map(async (key) => {
      try {
        urls[key] = await getPresignedUrl(key, expiresIn);
      } catch (error) {
        console.error(`Error generating URL for ${key}:`, error);
        urls[key] = ''; // or handle error differently
      }
    })
  );
  
  return urls;
}

/**
 * Upload a file to S3 and return the key
 * Note: This is for reference - actual upload should be done via API route
 */
export async function getS3Key(filename: string, folder?: string): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  if (folder) {
    return `${folder}/${timestamp}-${sanitizedFilename}`;
  }
  
  return `${timestamp}-${sanitizedFilename}`;
} 