# Private S3 Bucket with Presigned URLs Guide 🔒

## Overview

This guide explains how to use **private S3 buckets** with **presigned URLs** to ensure only your application can access images, while maintaining security and performance.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   S3 (Private)  │
│                 │    │                 │    │                 │
│ • Request URL   │───▶│ • Lambda        │───▶│ • Images        │
│ • Upload File   │    │ • Generate URL  │    │ • No Public     │
│ • View Images   │    │ • Auth Check    │    │   Access        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       ▲
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────┐    ┌─────────────────┐              │
│   DynamoDB      │    │   Presigned     │              │
│                 │    │   URLs          │              │
│ • Image metadata│    │ • Temporary     │              │
│ • File paths    │    │ • Secure        │              │
│ • Permissions   │    │ • Expiring      │              │
└─────────────────┘    └─────────────────┘              │
                                                        │
                                                        │
                                        ┌───────────────┴───────────────┐
                                        │                               │
                                        │  Direct Access via Presigned  │
                                        │  URL (bypasses your server)   │
                                        │                               │
                                        └───────────────────────────────┘
```

## Key Differences: Public vs Private Bucket

### Public Bucket (❌ Less Secure)
```typescript
// Anyone can access images directly
const publicUrl = "https://bucket.s3.amazonaws.com/image.jpg";
// No authentication required
// Images are publicly accessible
```

### Private Bucket (✅ Secure)
```typescript
// Only accessible via presigned URLs
const presignedUrl = "https://bucket.s3.amazonaws.com/image.jpg?X-Amz-Algorithm=...&X-Amz-Expires=3600...";
// Temporary access (1 hour)
// Requires authentication through your app
```

## Implementation Steps

### 1. Configure Private S3 Bucket

```typescript
// infra/storage.ts
export const bucket = new sst.aws.Bucket("MediaBucket", {
  public: false, // 🔒 Private bucket
  cors: [
    {
      allowedHeaders: ["*"],
      allowedMethods: ["GET", "PUT", "POST", "DELETE"],
      allowedOrigins: ["*"], // Restrict to your domain in production
      exposedHeaders: ["ETag"],
    },
  ],
});
```

### 2. Upload Flow (PUT Presigned URL)

```typescript
// 1. Frontend requests upload URL
const response = await fetch('/api/events/123/images', {
  method: 'POST',
  body: JSON.stringify({
    eventId: '123',
    fileName: 'photo.jpg',
    contentType: 'image/jpeg'
  })
});

// 2. Backend generates presigned URL
const putObjectCommand = new PutObjectCommand({
  Bucket: Resource.bucket.name,
  Key: `events/123/${Date.now()}-photo.jpg`,
  ContentType: 'image/jpeg',
});
const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 3600 });

// 3. Frontend uploads directly to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});
```

### 3. Download Flow (GET Presigned URL)

```typescript
// 1. Frontend requests image list
const response = await fetch('/api/events/123/images');

// 2. Backend generates presigned URLs for each image
const getObjectCommand = new GetObjectCommand({
  Bucket: Resource.bucket.name,
  Key: imageKey,
});
const viewUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });

// 3. Frontend uses presigned URL to view image
<img src={viewUrl} alt="Event Image" />
```

## Security Benefits

### 🔒 **Access Control**
- Only your application can generate presigned URLs
- No direct public access to S3 objects
- URLs expire after a set time (1 hour default)

### 🛡️ **Authentication**
- Presigned URLs include cryptographic signatures
- Cannot be tampered with or forged
- Tied to specific AWS credentials

### 📊 **Audit Trail**
- All access is logged in CloudTrail
- You can track who accessed what and when
- Full visibility into S3 operations

### 💰 **Cost Control**
- No unexpected bandwidth costs from public access
- You control who can access your data
- Prevents hotlinking and unauthorized downloads

## Best Practices

### 1. **URL Expiration**
```typescript
// Short expiration for sensitive data
const sensitiveUrl = await getSignedUrl(command, { expiresIn: 300 }); // 5 minutes

// Longer expiration for public content
const publicUrl = await getSignedUrl(command, { expiresIn: 86400 }); // 24 hours
```

### 2. **Content-Type Validation**
```typescript
// Validate file types on upload
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
if (!allowedTypes.includes(contentType)) {
  throw new Error('Invalid file type');
}
```

### 3. **File Size Limits**
```typescript
// Set reasonable file size limits
const maxSize = 10 * 1024 * 1024; // 10MB
if (fileSize > maxSize) {
  throw new Error('File too large');
}
```

### 4. **Path Security**
```typescript
// Use predictable, secure paths
const imageKey = `events/${eventId}/${Date.now()}-${sanitizeFileName(fileName)}`;
// Prevents path traversal attacks
```

## Error Handling

### Common Issues and Solutions

```typescript
// 1. URL Expired
if (error.code === 'AccessDenied') {
  // Regenerate presigned URL
  const newUrl = await generateNewPresignedUrl();
}

// 2. File Not Found
if (error.code === 'NoSuchKey') {
  // Handle missing file gracefully
  return { error: 'Image not found' };
}

// 3. Invalid Request
if (error.code === 'InvalidRequest') {
  // Log and handle invalid requests
  console.error('Invalid presigned URL request:', error);
}
```

## Performance Considerations

### ✅ **Advantages**
- Direct S3 uploads (bypasses Lambda)
- Reduced server load
- Better user experience
- Scalable architecture

### ⚠️ **Considerations**
- URL generation adds latency
- Need to handle URL expiration
- More complex error handling

## Monitoring and Logging

```typescript
// Track presigned URL usage
const metrics = {
  urlsGenerated: 0,
  uploadsCompleted: 0,
  downloadsCompleted: 0,
  errors: 0
};

// Log important events
console.log('Presigned URL generated:', {
  bucket: Resource.bucket.name,
  key: imageKey,
  expiresIn: 3600,
  timestamp: new Date().toISOString()
});
```

## Summary

Using private S3 buckets with presigned URLs provides:

1. **🔒 Enhanced Security** - No public access to your data
2. **⚡ Better Performance** - Direct S3 uploads/downloads
3. **📊 Full Control** - You decide who accesses what
4. **💰 Cost Efficiency** - No unexpected bandwidth costs
5. **🛡️ Audit Trail** - Complete visibility into access patterns

This approach is used by major companies like Dropbox, Google Drive, and AWS itself for secure file handling! 