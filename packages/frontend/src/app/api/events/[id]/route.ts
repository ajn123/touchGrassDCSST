import { NextRequest, NextResponse } from 'next/server';
import { updateEvent, getEvent, getEventByTitle } from '@/lib/dynamodb-events';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const response = await fetch(`${process.env.API_URL}/events/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    
    // Try to get event by title first, then by ID if that fails
    let event = await getEventByTitle(decodedId);
    
    if (!event) {
      // Fallback to getting by ID
      event = await getEvent(decodedId);
    }
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    
    const result = await updateEvent(id, formData);
    return NextResponse.json(JSON.parse(result.body), { status: result.statusCode });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 