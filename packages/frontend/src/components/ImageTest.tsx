'use client';

import { useState } from 'react';
import { PrivateImage } from './PrivateImage';

export function ImageTest() {
  const [testImageKey, setTestImageKey] = useState('');

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium mb-4">Image Display Test</h3>
      
      <div className="mb-4">
        <label htmlFor="imageKey" className="block text-sm font-medium mb-2">
          Test Image Key:
        </label>
        <input
          type="text"
          id="imageKey"
          value={testImageKey}
          onChange={(e) => setTestImageKey(e.target.value)}
          placeholder="Enter S3 image key (e.g., events/1234567890-image.jpg)"
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      {testImageKey && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Small Image (24x24):</h4>
            <PrivateImage
              imageKey={testImageKey}
              alt="Test Image Small"
              className="w-24 h-24 object-cover rounded"
            />
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Medium Image (200x200):</h4>
            <PrivateImage
              imageKey={testImageKey}
              alt="Test Image Medium"
              className="w-48 h-48 object-cover rounded"
            />
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Large Image (400x300):</h4>
            <PrivateImage
              imageKey={testImageKey}
              alt="Test Image Large"
              className="w-96 h-72 object-cover rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
} 