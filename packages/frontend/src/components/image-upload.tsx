'use client';

import { useState } from 'react';

interface ImageUploadProps {
  eventId: string;
  onUploadComplete?: () => void;
}

export default function ImageUpload({ eventId, onUploadComplete }: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL from API
      const response = await fetch(`/api/events/${eventId}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, imageKey } = await response.json();

      // Step 2: Upload directly to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to S3');
      }

      setUploadProgress(100);
      
      // Step 3: Notify parent component
      if (onUploadComplete) {
        onUploadComplete();
      }

      // Reset form
      setFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="image-upload" style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
      <h3>Upload Image for Event</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          id="file-input"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ marginBottom: '0.5rem' }}
        />
      </div>

      {file && (
        <div style={{ marginBottom: '1rem' }}>
          <p><strong>Selected file:</strong> {file.name}</p>
          <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>Type:</strong> {file.type}</p>
        </div>
      )}

      {uploading && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            width: '100%', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '0.25rem',
            overflow: 'hidden'
          }}>
            <div 
              style={{ 
                width: `${uploadProgress}%`, 
                height: '20px', 
                backgroundColor: '#007bff',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <p>Uploading... {uploadProgress}%</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: uploading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: uploading ? 'not-allowed' : 'pointer',
        }}
      >
        {uploading ? 'Uploading...' : 'Upload Image'}
      </button>
    </div>
  );
} 