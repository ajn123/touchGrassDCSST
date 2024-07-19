'use server'
import { GetItemCommand, DynamoDBClient, ScanCommand, PutItemCommand, DeleteItemCommand, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";
import { revalidatePath } from "next/cache";

// Geocoding function (copied from seed-data.ts to avoid import issues)
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number; formattedAddress: string } | null> {
  try {
    if (!address) {
      console.log('No address provided for geocoding');
      return null;
    }
    
    // Try both environment variable names
    let apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.log('No Google Maps API key found in environment (tried GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)');
      console.log('Please set the GOOGLE_MAPS_API_KEY environment variable or add it to your .env file');
      return null;
    }
    
    console.log(`Using API key: ${apiKey.substring(0, 10)}...`);

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    console.log(`Geocoding response for "${address}":`, JSON.stringify(data, null, 2));

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address
      };
    } else {
      console.log(`Geocoding failed for "${address}" with status: ${data.status}`);
      if (data.error_message) {
        console.log(`Error message: ${data.error_message}`);
      }
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}


const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});


export async function getCategories() {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
    });

    const result = await client.send(command);
    const uniqueCategories = new Set();
    
    result.Items?.forEach((item) => {
      const unmarshalledItem = unmarshall(item);
      
      if (Array.isArray(unmarshalledItem.category)) {
        // If category is an array, add each category to the set
        unmarshalledItem.category.forEach((category: string) => {
          if (category && category.trim()) {
            uniqueCategories.add(category.trim());
          }
        });
      } else if (unmarshalledItem.category) {
        // If category is a comma-separated string, split it and add each part
        const categories = unmarshalledItem.category.split(',').map((cat: string) => cat.trim());
        categories.forEach((category: string) => {
          if (category && category.trim()) {
            uniqueCategories.add(category.trim());
          }
        });
      }
    });
    
    console.log('Unique categories:', uniqueCategories);
    return Array.from(uniqueCategories).map(category => ({ category }));

    
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}


export async function getEventsByCategory(category: string) {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
    });

    const result = await client.send(command);
    const events = result.Items?.map((item) => {
      return unmarshall(item);
    }) || [];

    // Filter events that have the specified category in their category array or comma-separated string
    return events.filter((event) => {
      if (!event.category) return false;
      
      if (Array.isArray(event.category)) {
        // If category is an array, check if the specified category is in the array
        return event.category.includes(category);
      } else {
        // If category is a comma-separated string, split it and check if the specified category is included
        const categories = event.category.split(',').map((cat: string) => cat.trim());
        return categories.includes(category);
      }
    });
  } catch (error) {
    console.error('Error fetching events by category:', error);
    return [];
  }
}

export async function getEvent(id: string) { 
    try {
  
      const command = new GetItemCommand({
        TableName: process.env.DB_NAME,
        Key: {
          pk: { S: id },
          sk: { S: id }
        }
      })
  
      const result = await client.send(command);
      // Use AWS SDK's built-in unmarshall utility
      const unmarshalledItem = result.Item ? unmarshall(result.Item) : null;
      console.log(`Unmarshalled item: ${JSON.stringify(unmarshalledItem, null, 2)}`);
      
      return unmarshalledItem;
    } catch (error) {
      console.error('Error fetching item:', error);
      return null;
    }
  }

export async function getEventByTitle(title: string) {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: '#title = :title',
      ExpressionAttributeNames: {
        '#title': 'title'
      },
      ExpressionAttributeValues: {
        ':title': { S: title }
      }
    });

    const result = await client.send(command);
    const events = result.Items?.map((item) => unmarshall(item)) || [];
    
    // Return the first matching event (titles should be unique)
    return events.length > 0 ? events[0] : null;
  } catch (error) {
    console.error('Error fetching event by title:', error);
    return null;
  }
}

export async function getEvents() {
    try {
      const command = new ScanCommand({
        TableName: Resource.Db.name,
      });
      const result = await client.send(command);
  
      console.log('Raw DynamoDB result:', result);
      
      return result.Items?.map((item) => {
        // Use AWS SDK's unmarshall utility to convert DynamoDB format to regular object
        const unmarshalledItem = unmarshall(item);
        console.log('Unmarshalled item:', unmarshalledItem);
        return unmarshalledItem;
      }) || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }



export async function createEvent(event: any) {
    try {
      const timestamp = Date.now();
      
      // Check if eventId is provided in the form data
      let eventId = event.get('eventId');
      
      if (!eventId) {
        // Generate a unique event ID if none provided
        eventId = `EVENT${Date.now()}`;
      }
  
      // Check if item exists
      const existingEvent = await getEvent(eventId);
      
      // Build Item object dynamically from all body properties
      const item: any = {
        pk: { S: eventId },
        sk: { S: eventId },
        updatedAt: { N: timestamp.toString() },
      };
  
      // If it's a new event, set createdAt
      if (!existingEvent) {
        item.createdAt = { N: timestamp.toString() };
      } else {
        // Keep the original createdAt if updating
        item.createdAt = { N: existingEvent.createdAt.toString() };
      }
  
      // Add all other properties from body as strings
      for (const [key, value] of event.entries()) {
        if (key !== 'eventId') { // Skip eventId as it's already handled
          if (key === 'cost') {
            // Handle cost as a JSON object
            try {
              const costObj = JSON.parse(String(value));
              item[key] = { M: {
                type: { S: costObj.type },
                currency: { S: costObj.currency },
                amount: { N: costObj.amount.toString() }
              }};
            } catch (error) {
              console.error('Error parsing cost JSON:', error);
              item[key] = { S: String(value) };
            }
          } else if (key === 'title') {
            item[key] = { S: String(value) };
          } else {
            item[key] = { S: String(value) };
          }
        }
      }

      // Handle location data specifically (same as seed-data.ts)
      const location = event.get('location');
      const latitude = event.get('latitude');
      const longitude = event.get('longitude');
      
      if (location) {
        item.location = { S: location };
      }
      
      // If coordinates are provided, use them; otherwise try to geocode the address
      if (latitude && longitude) {
        item.coordinates = { S: `${latitude},${longitude}` };
        console.log(`📍 Event using provided coordinates: ${latitude},${longitude}`);
      } else if (location && !latitude && !longitude) {
        // Try to geocode the address to get coordinates
        try {
          console.log(`📍 Geocoding address: ${location}`);
          const geocoded = await geocodeAddress(location);
          if (geocoded) {
            item.coordinates = { S: `${geocoded.latitude},${geocoded.longitude}` };
            // Update location with formatted address if geocoding was successful
            item.location = { S: geocoded.formattedAddress };
            console.log(`✅ Geocoded to: ${geocoded.latitude},${geocoded.longitude}`);
          } else {
            console.log(`❌ Failed to geocode address: ${location}`);
          }
        } catch (error) {
          console.error(`❌ Geocoding error:`, error);
          // Continue without coordinates if geocoding fails
        }
      }
  
      const command = new PutItemCommand({
        TableName: Resource.Db.name,
        Item: item
      });
  
      const result = await client.send(command);
  
      const action = existingEvent ? "updated" : "created";
      
      // Send email notification for new events only
      if (!existingEvent) {
        try {
          await sendEventNotificationEmail(event, eventId);
        } catch (emailError) {
          console.error('Error sending event notification email:', emailError);
          // Don't fail the event creation if email fails
        }
      }
      
      revalidatePath('/');
      return `Event ${action} successfully`;

    } catch (error) {
      console.error('Error creating/updating event:', error);
      return "Error creating/updating event";
    }
}

// Function to send event notification email
async function sendEventNotificationEmail(event: any, eventId: string) {
  try {
    const title = event.get('title') || 'Untitled Event';
    const description = event.get('description') || 'No description provided';
    const date = event.get('eventDate') || 'No date specified';
    const location = event.get('location') || 'No location specified';
    const email = event.get('email') || 'No email provided';
    const category = event.get('category') || 'No category specified';
    const cost = event.get('cost') || 'No cost specified';
    const imageUrl = event.get('image_url') || 'No image provided';

    // Parse cost for better display
    let costDisplay = cost;
    try {
      const costObj = JSON.parse(cost);
      costDisplay = costObj.type === 'free' ? 'Free' : `$${costObj.amount}`;
    } catch (e) {
      // Keep original cost if parsing fails
    }

    const emailBody = `
New Event Submitted on TouchGrass DC

Event Details:
- Title: ${title}
- Date: ${date}
- Location: ${location}
- Cost: ${costDisplay}
- Category: ${category}
- Submitted by: ${email}

Description:
${description}

${imageUrl !== 'No image provided' ? `Image URL: ${imageUrl}` : ''}

Event ID: ${eventId}
Submitted at: ${new Date().toLocaleString()}

View the event at: https://touchgrassdc.com/items/${encodeURIComponent(title)}
    `.trim();

    // Send email using the same approach as contact form
    const response = await fetch(Resource.SendEmail.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'hello@touchgrassdc.com',
        subject: `New Event Submitted: ${title}`,
        body: emailBody,
        from: 'hello@touchgrassdc.com',
        replyTo: email
      }),
    });

    if (!response.ok) {
      throw new Error(`Email service returned ${response.status}`);
    }

    console.log('Event notification email sent successfully');
  } catch (error) {
    console.error('Failed to send event notification email:', error);
    // Log the event details as fallback
    console.log('=== EVENT NOTIFICATION FALLBACK ===');
    console.log('New event submitted but email notification failed');
    console.log('Event ID:', eventId);
    console.log('Title:', event.get('title'));
    console.log('Submitted by:', event.get('email'));
    console.log('===============================');
    throw error;
  }
}


export async function deleteEvent(id: string) {
    try {
      const eventId = id;
      
      if (!eventId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Event ID is required'
          }),
        };
      }
  
      const command = new DeleteItemCommand({
        TableName: Resource.Db.name,
        Key: {
          pk: { S: eventId },
          sk: { S: eventId }
        }
      });
  
      const result = await client.send(command);

      revalidatePath('/');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Event deleted successfully',
          deletedItem: result.Attributes
        }),
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Failed to delete event',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
      };
    }
  };

export async function deleteMultipleEvents(eventIds: string[]) {
  try {
    if (!eventIds || eventIds.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No event IDs provided' }),
      };
    }

    // BatchWriteItem can handle up to 25 items per request
    const batchSize = 25;
    const batches = [];
    
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      batches.push(batch);
    }

    const results = [];
    
    for (const batch of batches) {
      const deleteRequests = batch.map(eventId => ({
        DeleteRequest: {
          Key: {
            pk: { S: eventId },
            sk: { S: eventId }
          }
        }
      }));

      const command = new BatchWriteItemCommand({
        RequestItems: {
          [Resource.Db.name]: deleteRequests
        }
      });

      const result = await client.send(command);
      results.push(result);
    }

    revalidatePath('/');
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully deleted ${eventIds.length} events`,
        deletedCount: eventIds.length
      }),
    };
  } catch (error) {
    console.error('Error deleting multiple events:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to delete events',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
}

export async function deleteEventsByCategory(category: string) {
  try {
    // First, get all events in the category
    const events = await getEventsByCategory(category);
    
    if (!events || events.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `No events found in category: ${category}` }),
      };
    }

    // Extract event IDs
    const eventIds = events.map(event => event.pk || event.id);
    
    // Delete them using the batch delete function
    return await deleteMultipleEvents(eventIds);
  } catch (error) {
    console.error('Error deleting events by category:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to delete events by category',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
}

export async function updateEvent(eventId: string, eventData: any) {
  try {
    // Check if item exists
    const existingEvent = await getEvent(eventId);
    
    if (!existingEvent) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Event not found' }),
      };
    }

    const timestamp = Date.now();
    
    // Build Item object for update
    const item: any = {
      pk: { S: eventId },
      sk: { S: eventId },
      createdAt: { N: existingEvent.createdAt.toString() }, // Keep original createdAt
      updatedAt: { N: timestamp.toString() },
    };

    // Add all other properties from eventData
    for (const [key, value] of eventData.entries()) {
      if (key !== 'eventId') { // Skip eventId as it's already handled
        if (key === 'title') {
          item[key] = { S: String(value) };
        } else {
          item[key] = { S: String(value) };
        }
      }
    }

    const command = new PutItemCommand({
      TableName: Resource.Db.name,
      Item: item
    });

    const result = await client.send(command);
    revalidatePath('/');
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Event updated successfully',
        eventId: eventId
      }),
    };

  } catch (error) {
    console.error('Error updating event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to update event',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
}
  