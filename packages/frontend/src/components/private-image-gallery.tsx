'use client';

import { useState, useEffect } from 'react';
import ImageUpload from './image-upload';

interface Image {
  imageKey: string;
  fileName: string;
  contentType: string;
  viewUrl: string;
  createdAt: string;
}

interface PrivateImageGalleryProps {
  eventId: string;
}

export default function PrivateImageGallery({ eventId }: PrivateImageGalleryProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}/images`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      setImages(data.images || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [eventId]);

  const handleUploadComplete = () => {
    // Refresh the image list after upload
    fetchImages();
  };

  const handleImageClick = (image: Image) => {
    // Open image in new tab using the presigned URL
    window.open(image.viewUrl, '_blank');
  };

  if (loading) {
    return <div>Loading images...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="private-image-gallery" style={{ padding: '1rem' }}>
      <h2>Event Images (Private Bucket)</h2>
      
      {/* Upload Section */}
      <div style={{ marginBottom: '2rem' }}>
        <ImageUpload eventId={eventId} onUploadComplete={handleUploadComplete} />
      </div>

      {/* Image Gallery */}
      <div style={{ marginTop: '2rem' }}>
        <h3>Uploaded Images</h3>
        {images.length === 0 ? (
          <p>No images uploaded yet.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            {images.map((image) => (
              <div 
                key={image.imageKey}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onClick={() => handleImageClick(image)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{ 
                  width: '100%', 
                  height: '150px', 
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.25rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#666' }}>
                    {image.contentType.startsWith('image/') ? '🖼️' : '📄'} 
                    {image.fileName}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem' }}>
                  <p><strong>File:</strong> {image.fileName}</p>
                  <p><strong>Type:</strong> {image.contentType}</p>
                  <p><strong>Uploaded:</strong> {new Date(image.createdAt).toLocaleDateString()}</p>
                  <p style={{ color: '#007bff', fontSize: '0.7rem' }}>
                    Click to view (presigned URL)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Info */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '0.5rem',
        border: '1px solid #dee2e6'
      }}>
        <h4>🔒 Security Features</h4>
        <ul style={{ fontSize: '0.875rem', margin: '0.5rem 0' }}>
          <li><strong>Private Bucket:</strong> Images are not publicly accessible</li>
          <li><strong>Presigned URLs:</strong> Temporary access (1 hour expiration)</li>
          <li><strong>Direct Upload:</strong> Files go directly to S3 (bypasses server)</li>
          <li><strong>Metadata Storage:</strong> File info stored securely in DynamoDB</li>
        </ul>
      </div>
    </div>
  );
} 