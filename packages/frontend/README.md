# Frontend Package

This package contains the Next.js frontend application for the Touch Grass DC SST project.

## Features

### Event Search with Field Projection

The events API now supports field projection to return only specific fields, improving performance and reducing data transfer.

#### Usage

To search for events and return only specific fields, use the `fields` query parameter:

```bash
# Return only title, location, and cost fields
GET /api/events?fields=title,location,cost

# Return only title and cost fields with a search query
GET /api/events?q=concert&fields=title,cost

# Return only title and location fields for specific categories
GET /api/events?categories=music,art&fields=title,location
```

#### Supported Fields

The following fields can be specified in the `fields` parameter:

- `title` - Event title
- `location` - Event location
- `cost` - Event cost information
- `description` - Event description
- `venue` - Event venue
- `date` - Event date
- `category` - Event categories
- `isPublic` - Public visibility flag
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

#### Implementation Details

- Field projection is implemented using DynamoDB's `ProjectionExpression`
- Required fields (like `pk` for primary key) are automatically included
- The feature works with all search methods: title search, category search, date search, and general scan
- Improves performance by reducing data transfer from DynamoDB
- Maintains backward compatibility - if no `fields` parameter is provided, all fields are returned

#### Example Response

When using `?fields=title,location,cost`:

```json
{
  "events": [
    {
      "title": "Summer Concert",
      "location": "National Mall",
      "cost": "Free"
    },
    {
      "title": "Art Exhibition",
      "location": "Smithsonian",
      "cost": "$15"
    }
  ],
  "count": 2,
  "executionTime": 45
}
```

### HomepageMap Component

A comprehensive map component that displays all events with location data on a single Google Map.

#### Features

- **Interactive Map**: Shows all events with coordinates on a Google Map
- **Smart Bounds**: Automatically adjusts map view to show all event locations
- **Custom Markers**: Beautiful blue location pins for each event
- **Info Windows**: Click markers to see detailed event information
- **Field Projection**: Efficiently fetches only necessary data using the field projection API
- **Responsive Design**: Adapts to different screen sizes
- **Loading States**: Shows loading spinner and error handling

#### Usage

```tsx
import HomepageMap from "@/components/HomepageMap";

export default function HomePage() {
  return (
    <div>
      <h1>Welcome to DC Events</h1>
      <HomepageMap />
    </div>
  );
}
```

#### API Integration

The component automatically fetches events using:

```bash
GET /api/events?fields=title,description,location,coordinates,cost,category,date&isPublic=true
```

This ensures:

- Only events with location data are fetched
- Field projection reduces data transfer
- Only public events are displayed
- Efficient loading and rendering

#### Map Features

- **Automatic Zoom**: Adjusts to show all event locations
- **Custom Styling**: Clean, modern map appearance
- **Marker Animation**: Drop animation when markers appear
- **Info Window Content**: Rich event details including:
  - Event title and description
  - Location address
  - Date and category
  - Cost information
- **Interactive Controls**: Zoom, pan, and map type controls

#### Error Handling

- **Loading State**: Shows spinner while fetching data
- **No Events**: Displays message when no events with location data exist
- **API Errors**: Shows error message if data fetching fails
- **Map Errors**: Gracefully handles Google Maps loading issues

#### Performance Optimizations

- **Field Projection**: Only fetches required fields from DynamoDB
- **Efficient Rendering**: Creates markers only for events with valid coordinates
- **Memory Management**: Properly cleans up markers and info windows
- **Lazy Loading**: Google Maps loads only when needed

## Development

### Running the Application

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## API Endpoints

- `GET /api/events` - Search and retrieve events with optional field projection
- `GET /api/events/[id]` - Get a specific event by ID
- `POST /api/events` - Create a new event
- `PUT /api/events/[id]` - Update an existing event
- `DELETE /api/events/[id]` - Delete an event
