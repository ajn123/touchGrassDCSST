'use client';

import Link from 'next/link';
import { PrivateImage } from './PrivateImage';
import { DeleteButton } from './delete-button';
import { Cost } from './Cost';

interface EventItemProps {
  event: {
    pk?: string;
    id?: string;
    title?: string;
    description?: string;
    date?: string | number;
    location?: string;
    createdAt?: string | number;
    imageKey?: string;
    cost?: {
      type: string;
      currency?: string;
      amount?: string | number;
    };
    category?: string;
  };
  showDeleteButton?: boolean;
  className?: string;
}

export function EventItem({ event, showDeleteButton = false, className = "" }: EventItemProps) {
  const eventId = event.pk || event.id;
  const eventTitle = event.title || '';

  console.log(event);
  
  return (
    <div className={`mb-4 p-4 bg-white rounded shadow hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Link href={`/items/${encodeURIComponent(eventTitle)}`}>
            <div className="flex gap-4">
              {/* Event Image */}
              {event.imageKey && (
                <div className="flex-shrink-0">
                  <PrivateImage
                    imageKey={event.imageKey}
                    alt={event.title || 'Event'}
                    className="w-24 h-24 object-cover rounded"
                  />
                </div>
              )}
              
              {/* Event Details */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                  {event.title || 'Untitled Event'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {event.description || 'No description available'}
                </p>
                <div className="mt-2 space-y-1">
                  {event.date && (
                    <p className="text-sm text-gray-500">
                      📅 {new Date(event.date).toLocaleDateString()}
                    </p>
                  )}
                  {event.location && (
                    <p className="text-sm text-gray-500">
                      📍 {event.location}
                    </p>
                  )}
                  {event.cost && (
                    <div className="text-sm">
                      <Cost cost={event.cost} />
                    </div>
                  )}
                  {event.category && (
                    <p className="text-sm text-gray-500">
                      🏷️ {event.category}
                    </p>
                  )}
                  {event.createdAt && (
                    <p className="text-sm text-gray-400">
                      Added: {new Date(event.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </div>
        
        {/* Delete Button */}
        {showDeleteButton && eventId && (
          <div className="flex-shrink-0 ml-4">
            <DeleteButton eventId={eventId} />
          </div>
        )}
      </div>
    </div>
  );
} 