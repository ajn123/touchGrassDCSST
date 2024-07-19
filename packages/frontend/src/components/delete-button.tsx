'use client';

import { deleteEvent } from '@/lib/dynamodb-events';
import { useRouter } from 'next/navigation';

interface DeleteButtonProps {
  eventId: string;
}

export function DeleteButton({ eventId,}: DeleteButtonProps) {
  const router = useRouter();

  console.log('eventId', eventId);
    const handleDelete = async () => {
    console.log('Deleting event:', eventId);

  };

  return (
    <button 
      onClick={() => deleteEvent(eventId)}
      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
    >
      Delete
    </button>
  );
} 