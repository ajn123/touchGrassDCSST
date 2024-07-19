import { EmailSignupForm } from '@/components/EmailSignupForm';
import { getCategories } from '@/lib/dynamodb-events';

export default async function EmailSignupPage() {
  const categories = await getCategories();
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sign Up For Event Updates</h1>
          <p className="text-gray-600 mt-2">
            Get notified about new events in your favorite categories
          </p>
        </div>
        
        <EmailSignupForm categories={categories as Array<{category: string}>} />
      </div>
    </div>
  );
} 