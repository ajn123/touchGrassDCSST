import { getEvents} from '@/lib/dynamodb-events';
import { EventItem } from '@/components/EventItem';

export default async function EventList() {
    const events = await getEvents();

    return (
        <>
        {events?.length == 0 && 
            (<h1>No events</h1>)}
            {events?.map((event: any) => (
          <EventItem 
            key={event.pk || event.id} 
            event={event}
            showDeleteButton={false}
          />
        ))}
            </>
    );
}