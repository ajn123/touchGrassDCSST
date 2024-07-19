'use client';

import { usePresignedUrl, useMultiplePresignedUrls } from '@/lib/hooks/usePresignedUrl';
import { useState } from 'react';

interface PrivateImageProps {
  imageKey: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  expiresIn?: number;
  artificialDelay?: number;
}

export function PrivateImage({ 
  imageKey, 
  alt = 'Image', 
  className = '',
  fallbackSrc = '/placeholder-image.jpg',
  expiresIn = 3600,
  artificialDelay = 0
}: PrivateImageProps) {
  const { url, loading, error } = usePresignedUrl(imageKey, { expiresIn, artificialDelay });
  const [imageError, setImageError] = useState(false);

  if (loading) {
    return (
      <div className={`relative overflow-hidden bg-gray-200 rounded ${className}`}>
        <div className="w-full h-full min-h-[200px] flex items-center justify-center">
          {/* Animated skeleton loader */}
          <div className="w-full h-full relative">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
            
            {/* Image icon placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400">
                <svg className="w-12 h-12 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || imageError) {
    return (
      <div className={`bg-gray-100 rounded flex items-center justify-center ${className}`}>
        <img 
          src={fallbackSrc} 
          alt={alt} 
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <img
      src={url || fallbackSrc}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
    />
  );
}

// Component for multiple images
interface ImageGalleryProps {
  imageKeys: string[];
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  expiresIn?: number;
}

export function ImageGallery({ 
  imageKeys, 
  alt = 'Gallery', 
  className = '',
  fallbackSrc = '/placeholder-image.jpg',
  expiresIn = 3600
}: ImageGalleryProps) {
  const { urls, loading, error } = useMultiplePresignedUrls(imageKeys, { expiresIn });

  if (loading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
        {imageKeys.map((key) => (
          <div key={key} className="relative overflow-hidden bg-gray-200 rounded h-48">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
            
            {/* Image icon placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400">
                <svg className="w-8 h-8 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center text-gray-500 ${className}`}>
        Failed to load images
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
      {imageKeys.map((key) => (
        <PrivateImage
          key={key}
          imageKey={key}
          alt={`${alt} ${key}`}
          className="w-full h-48 object-cover rounded"
          fallbackSrc={fallbackSrc}
          expiresIn={expiresIn}
        />
      ))}
    </div>
  );
}

// Test component for Suspense testing
export function TestPrivateImage({ 
  imageKey, 
  alt = 'Test Image', 
  className = '',
  fallbackSrc = '/placeholder-image.jpg',
  delay = 3000 // Default 3 second delay for testing
}: Omit<PrivateImageProps, 'artificialDelay'> & { delay?: number }) {
  return (
    <PrivateImage
      imageKey={imageKey}
      alt={alt}
      className={className}
      fallbackSrc={fallbackSrc}
      artificialDelay={delay}
    />
  );
} 