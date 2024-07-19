'use client';

export default function MapDebug() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  return (
    <div className="bg-yellow-100 border border-yellow-400 p-4 rounded-lg mb-4">
      <h3 className="font-semibold text-yellow-800 mb-2">Google Maps Debug Info</h3>
      <div className="text-sm text-yellow-700">
        <p><strong>API Key Present:</strong> {apiKey ? 'Yes' : 'No'}</p>
        <p><strong>API Key Length:</strong> {apiKey ? apiKey.length : 0}</p>
        <p><strong>API Key Preview:</strong> {apiKey ? `${apiKey.substring(0, 10)}...` : 'None'}</p>
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
      </div>
    </div>
  );
} 