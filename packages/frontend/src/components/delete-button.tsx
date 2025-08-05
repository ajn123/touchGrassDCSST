'use client';

import { deleteEvent } from '@/lib/dynamodb-events';

interface DeleteButtonProps {
  eventId: string;
}

export function DeleteButton({ eventId,}: DeleteButtonProps) {

    const handleDelete = async () => {
      if (confirm('Are you sure you want to delete this event?')) {
        await deleteEvent(eventId);
        
      }
  };

  return (
    <button 
      onClick={() => handleDelete()}
      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
    >
      Delete Event
    </button>
  );
} 