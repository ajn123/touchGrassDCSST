import { AddEventForm } from '@/components/AddEventForm';

export default function AddEventPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Event</h1>
          <p className="text-gray-600 mt-2">
            Share your event with the DC community
          </p>
        </div>
        
        <AddEventForm />
      </div>
    </div>
  );
} 