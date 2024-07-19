import { TestPrivateImage } from "@/components/PrivateImage";
import { LoadingImage } from "@/components/LoadingImage";
import { Suspense } from "react";

export default function SuspenseTestPage() {
  return (
    <div className="container" style={{ marginTop: '2rem', backgroundColor: 'white', padding: '2rem', borderRadius: '1rem' }}>
      <h1>Suspense Component Testing</h1>
      <p>This page is for testing Suspense components with artificial delays.</p>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Test 1: 1 Second Delay</h2>
        <Suspense fallback={<LoadingImage size="md" showText={false} />}>
          <TestPrivateImage 
            imageKey="test-image-1.jpg" 
            className="w-64 h-48 object-cover rounded"
            delay={1000}
          />
        </Suspense>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Test 2: 3 Second Delay</h2>
        <Suspense fallback={<LoadingImage size="md" showText={false} />}>
          <TestPrivateImage 
            imageKey="test-image-2.jpg" 
            className="w-64 h-48 object-cover rounded"
            delay={3000}
          />
        </Suspense>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Test 3: 5 Second Delay</h2>
        <Suspense fallback={<LoadingImage size="md" showText={false} />}>
          <TestPrivateImage 
            imageKey="test-image-3.jpg" 
            className="w-64 h-48 object-cover rounded"
            delay={5000}
          />
        </Suspense>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Test 4: Multiple Images with Different Delays</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Suspense fallback={<LoadingImage size="sm" showText={false} className="w-full h-32" />}>
            <TestPrivateImage 
              imageKey="test-image-4.jpg" 
              className="w-full h-32 object-cover rounded"
              delay={2000}
            />
          </Suspense>
          
          <Suspense fallback={<LoadingImage size="sm" showText={false} className="w-full h-32" />}>
            <TestPrivateImage 
              imageKey="test-image-5.jpg" 
              className="w-full h-32 object-cover rounded"
              delay={4000}
            />
          </Suspense>
          
          <Suspense fallback={<LoadingImage size="sm" showText={false} className="w-full h-32" />}>
            <TestPrivateImage 
              imageKey="test-image-6.jpg" 
              className="w-full h-32 object-cover rounded"
              delay={6000}
            />
          </Suspense>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e8f4fd', borderRadius: '0.5rem' }}>
        <h3>Testing Instructions:</h3>
        <ul>
          <li>Refresh the page to see the loading states</li>
          <li>Try different network conditions in DevTools</li>
          <li>Use the browser's "Slow 3G" network throttling</li>
          <li>Test with different image keys that might not exist</li>
        </ul>
      </div>
    </div>
  );
} 