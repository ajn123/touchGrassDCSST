/**
 * Client-side S3 utilities
 * These functions can be used in client components
 */

/**
 * Generate an S3 key for file uploads
 * @param filename - The original filename
 * @param folder - Optional folder path
 * @returns Generated S3 key
 */
export function generateS3Key(filename: string, folder?: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  if (folder) {
    return `${folder}/${timestamp}-${sanitizedFilename}`;
  }
  
  return `${timestamp}-${sanitizedFilename}`;
}

/**
 * Validate file type for upload
 * @param file - File object to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if file type is allowed
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 * @param file - File object to validate
 * @param maxSizeMB - Maximum file size in MB
 * @returns True if file size is within limit
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
} 