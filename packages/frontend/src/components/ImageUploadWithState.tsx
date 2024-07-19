'use client';

import { useState, useEffect } from 'react';
import { ImageUpload } from './ImageUpload';

interface UploadResult {
  key: string;
  filename: string;
  size: number;
  type: string;
}

interface ImageUploadWithStateProps {
  folder?: string;
  className?: string;
  onImageUploaded?: (result: UploadResult) => void;
  formId?: string; // ID of the form to integrate with
}

export function ImageUploadWithState({ 
  folder = 'uploads',
  className = '',
  onImageUploaded,
  formId
}: ImageUploadWithStateProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadResult[]>([]);
  const [lastUploadedKey, setLastUploadedKey] = useState<string | null>(null);
  const [isAttachedToForm, setIsAttachedToForm] = useState(false);

  const handleUploadComplete = (result: UploadResult) => {
    console.log('Upload successful:', result);
    setUploadedImages(prev => [...prev, result]);
    setLastUploadedKey(result.key);
    setIsAttachedToForm(false);
    
    // Call the parent callback if provided
    onImageUploaded?.(result);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
    alert(`Upload failed: ${error}`);
  };

  // Add hidden input to form when image is uploaded
  useEffect(() => {
    if (lastUploadedKey && formId) {
      const form = document.getElementById(formId) as HTMLFormElement;
      if (form) {
        // Remove existing hidden input if it exists
        const existingInput = form.querySelector('input[name="imageKey"]');
        if (existingInput) {
          existingInput.remove();
        }

        // Add new hidden input
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'imageKey';
        hiddenInput.value = lastUploadedKey;
        form.appendChild(hiddenInput);
        
        setIsAttachedToForm(true);
        console.log('Image key attached to form:', lastUploadedKey);
      }
    }
  }, [lastUploadedKey, formId]);

  return (
    <div className={className}>
      <ImageUpload
        folder={folder}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
      />
      
      {/* Display uploaded images */}
      {uploadedImages.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Uploaded Images:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedImages.map((image, index) => (
              <div key={index} className="border rounded p-2">
                <p className="text-sm font-medium">{image.filename}</p>
                <p className="text-xs text-gray-500">Key: {image.key}</p>
                <p className="text-xs text-gray-500">Size: {(image.size / 1024).toFixed(1)} KB</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Status indicators */}
      {lastUploadedKey && (
        <div className="mt-2 space-y-2">
          <div className="p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-700">
              ✅ Image uploaded successfully!
            </p>
          </div>
          
          {isAttachedToForm && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700">
                🔗 Image attached to form - will be included when you submit!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 