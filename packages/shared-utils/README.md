# @touchgrass/shared-utils

Shared utility functions for TouchGrass DC event processing across the application.

## Features

- **Date Parsing**: Consistent date parsing across different formats
- **Event Normalization**: Standardized event data transformation
- **Validation**: Event data validation and sanitization
- **TypeScript Support**: Full type definitions included

## Installation

```bash
# Add to your package.json dependencies
npm install @touchgrass/shared-utils
```

## Usage

### Date Parsing

```typescript
import {
  parseDate,
  parseDateTime,
  parseComplexDate,
} from "@touchgrass/shared-utils";

// Simple date parsing
const date = parseDate("2024-01-15"); // Returns '2024-01-15'
const date2 = parseDate(new Date()); // Returns current date in YYYY-MM-DD format

// DateTime parsing
const dateTime = parseDateTime("2024-01-15T19:00:00Z"); // Returns ISO string

// Complex date parsing for crawler data
const complexDate = parseComplexDate("January 15, 2024 at 7:00 PM"); // Returns ISO string
```

### Event Normalization

```typescript
import {
  transformEventForOpenSearch,
  transformOpenWebNinjaEvent,
  validateEvent,
  sanitizeEvent,
} from "@touchgrass/shared-utils";

// Transform DynamoDB event for OpenSearch
const searchableEvent = transformEventForOpenSearch(dynamoEvent);

// Transform OpenWebNinja API event
const normalizedEvent = transformOpenWebNinjaEvent(apiEvent);

// Validate event data
const validation = validateEvent(event);
if (!validation.isValid) {
  console.log("Validation errors:", validation.errors);
}

// Sanitize event data
const cleanEvent = sanitizeEvent(event);
```

### Utility Functions

```typescript
import {
  parseCostAmount,
  parseCategories,
  generateEventId,
} from "@touchgrass/shared-utils";

// Parse cost amounts
const cost = parseCostAmount("25.99"); // Returns 25.99
const freeCost = parseCostAmount("free"); // Returns 0

// Parse categories
const categories = parseCategories("Music, Arts, Culture"); // Returns ['Music', 'Arts', 'Culture']
const arrayCategories = parseCategories(["Music", "Arts"]); // Returns ['Music', 'Arts']

// Generate consistent event IDs
const eventId = generateEventId(event, "openwebninja"); // Returns 'EVENT-OPENWEBNINJA-event-title-1234567890'
```

## API Reference

### Date Functions

- `parseDate(dateValue: any): string | undefined` - Parse various date formats to YYYY-MM-DD
- `parseDateTime(dateValue: any): string | undefined` - Parse dates to ISO string format
- `parseComplexDate(dateText: string): string | null` - Parse complex date strings from web scraping

### Event Functions

- `parseCostAmount(amount: any): number` - Parse cost amounts from various formats
- `parseCategories(category: any): string[]` - Parse categories from string or array
- `generateEventId(event: NormalizedEvent, source?: string): string` - Generate consistent event IDs

### Transformation Functions

- `transformEventForOpenSearch(event: any): any` - Transform DynamoDB event for OpenSearch
- `transformOpenWebNinjaEvent(event: any): NormalizedEvent` - Transform OpenWebNinja API event

### Validation Functions

- `validateEvent(event: any): { isValid: boolean; errors: string[] }` - Validate event data
- `sanitizeEvent(event: any): any` - Sanitize event data for safe storage

## Types

```typescript
export interface NormalizedEvent {
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  venue?: string;
  coordinates?: string;
  category?: string | string[];
  image_url?: string;
  url?: string;
  socials?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  cost?: {
    type: "free" | "fixed" | "variable";
    currency: string;
    amount: string | number;
  };
  source?: string;
  external_id?: string;
  is_public?: boolean;
  is_virtual?: boolean;
  publisher?: string;
  ticket_links?: string[];
  confidence?: number;
  extractionMethod?: string;
}
```

## Migration Guide

### From Local Implementations

If you have local implementations of these functions, you can migrate by:

1. **Remove local functions**:

   ```typescript
   // Remove these local implementations
   function parseDate(dateValue: any) { ... }
   function parseCostAmount(amount: any) { ... }
   function parseCategories(category: any) { ... }
   ```

2. **Add imports**:

   ```typescript
   import {
     parseDate,
     parseCostAmount,
     parseCategories,
   } from "@touchgrass/shared-utils";
   ```

3. **Update function calls** (usually no changes needed):
   ```typescript
   // These calls should work the same way
   const date = parseDate(event.start_date);
   const cost = parseCostAmount(event.cost);
   const categories = parseCategories(event.category);
   ```

## Contributing

When adding new utility functions:

1. Add the function to `src/index.ts`
2. Include proper TypeScript types
3. Add JSDoc comments
4. Export from the main module
5. Update this README with usage examples

## License

MIT
