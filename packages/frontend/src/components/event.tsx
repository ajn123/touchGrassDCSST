'use client';
import { useState } from 'react';
import { DeleteButton } from './delete-button';
import Link from 'next/link';

export default function EventListClient({ data }: { data: any }) {
  const [events, setEvents] = useState(data.events);


  return (
    <div className="container">

      <h1>Events</h1>
      <ul className="events-list container mx-auto bg-gray-100 p-4 rounded-md mb-4">
      {events.map((event: any) => (
        <div key={event.id} className="mb-4 p-4 bg-white rounded shadow">
          <Link href={`/items/${encodeURIComponent(event.name || event.title || '')}`}>
            <div>
              <h2>{event.name}</h2>
              <p>{event.description}</p>
              <p>{event.createdAt}</p>
            </div>
          </Link>
          {/* Delete button is now a separate Client Component */}
          <DeleteButton eventId={event.id} />
        </div>
      ))}
      </ul>
    </div>
  );
}