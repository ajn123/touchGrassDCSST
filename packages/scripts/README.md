# DC Event Web Crawler

A comprehensive web crawler system for automatically discovering and collecting events from various DC-area websites and sources.

## Features

- 🕷️ **Multi-source crawling**: Crawls multiple event websites simultaneously
- 📅 **Smart date parsing**: Automatically parses various date formats
- 🏷️ **Category mapping**: Maps event categories to standardized types
- 💰 **Cost extraction**: Parses and normalizes event pricing
- 🔄 **Scheduled crawling**: Automated crawling on daily, weekly, and monthly schedules
- 📊 **Progress tracking**: Monitors crawl jobs and success rates
- 🚫 **Duplicate detection**: Prevents duplicate events from being saved
- 🤖 **Respectful crawling**: Rate limiting and polite behavior

## Supported Event Sources

### Government & Cultural

- **DC Government Events** - Official DC government events and meetings
- **Smithsonian Events** - Museum exhibitions, lectures, and programs
- **Kennedy Center Events** - Performances, theater, and cultural events
- **National Park Service DC Events** - Park programs and tours

### Media & Entertainment

- **DC Theater Scene** - Local theater productions and shows
- **Washington Post Going Out Guide** - Entertainment and events coverage
- **DCist Events** - Local news and events
- **Washingtonian Events** - Lifestyle and entertainment

### Recreation & Community

- **Capital Bikeshare Events** - Cycling and community events
- **DC Department of Parks and Recreation** - Fitness classes and outdoor activities

### Social Media

- **Instagram DC Events** - Event hashtags and geotags
- **Twitter DC Events** - Event-related tweets and hashtags

## Installation

1. Install dependencies:

```bash
cd packages/scripts
npm install
```

2. Ensure you have the necessary AWS credentials and SST environment set up.

## Usage

### Start Scheduled Crawling

Run the crawler on its automated schedule:

```bash
npm run crawl
```

This will start crawling:

- **Daily at 6 AM**: Major sources (Government, Smithsonian, Kennedy Center)
- **Weekly on Sundays at 2 AM**: Secondary sources (Theater, Media)
- **Monthly on the 1st at 3 AM**: Niche sources (Parks, Bikeshare)
- **Every 4 hours**: Social media sources

### Manual Crawling

Crawl all sources manually:

```bash
npm run crawl:manual
```

Crawl specific sources:

```bash
npm run crawl:manual "DC Government Events" "Smithsonian Events"
```

### Crawl Specific Sources

Crawl only certain sources:

```bash
npm run crawl:sources "Kennedy Center Events" "DC Theater Scene"
```

### View Crawl History

Check recent crawl jobs:

```bash
npm run crawl:history
```

View more history:

```bash
npm run crawl:history 25
```

### Test the Crawler

Run basic functionality tests:

```bash
npm run crawl:test
```

## Configuration

### Crawler Settings

Edit `src/dc-event-sources.ts` to modify:

- **Event sources**: Add/remove websites to crawl
- **CSS selectors**: Update selectors for different website layouts
- **Category mapping**: Customize how event categories are mapped
- **Crawling schedules**: Adjust when different sources are crawled
- **Rate limiting**: Modify delays and concurrent request limits

### Adding New Sources

To add a new event source:

1. Add a new configuration to `dcEventSources` array:

```typescript
{
  name: 'New Event Source',
  baseUrl: 'https://example.com',
  eventUrls: [
    'https://example.com/events',
    'https://example.com/calendar',
  ],
  selectors: {
    eventContainer: '.event-item',
    title: 'h2',
    description: '.event-description',
    location: '.event-location',
    date: '.event-date',
    category: '.event-category',
    image: 'img',
    website: 'a[href*="/event"]',
  },
  dateFormats: ['MMM DD, YYYY', 'MMM DD'],
  categoryMapping: {
    'custom': 'Standard Category',
  },
}
```

2. Add the source to appropriate crawling schedules in `crawlingSchedule`.

### Customizing Selectors

The crawler uses CSS selectors to find event information. Common patterns:

- **Event containers**: `.event-item`, `[class*="event"]`
- **Titles**: `h2`, `h3`, `.event-title`
- **Descriptions**: `.event-description`, `.summary`
- **Dates**: `.event-date`, `time`, `.date`
- **Locations**: `.event-location`, `.venue`
- **Categories**: `.event-category`, `.type`
- **Images**: `img`
- **Links**: `a[href*="/event"]`

## Data Structure

Events are saved to DynamoDB with the following structure:

```typescript
interface EventData {
  title: string; // Event title
  description?: string; // Event description
  location?: string; // Event location/venue
  date?: string; // ISO date string
  start_date?: string; // Start date (YYYY-MM-DD)
  end_date?: string; // End date (YYYY-MM-DD)
  category?: string | string[]; // Event category(ies)
  image_url?: string; // Event image URL
  cost?: {
    // Cost information
    type: string; // 'free', 'fixed', 'variable'
    currency: string; // Currency code
    amount: string | number; // Cost amount or range
  };
  socials?: {
    // Social media links
    website?: string; // Event website
    facebook?: string; // Facebook page
    instagram?: string; // Instagram account
    twitter?: string; // Twitter account
  };
  venue?: string; // Venue name
  is_public?: boolean; // Public visibility
}
```

## Monitoring & Maintenance

### Crawl Job Tracking

The crawler automatically tracks all crawl jobs in DynamoDB:

- **Job status**: pending, running, completed, failed
- **Progress metrics**: events found, events saved
- **Error logging**: detailed error messages for failed crawls
- **Timing**: start/end times for performance monitoring

### Health Checks

Monitor crawler health:

```bash
# Check recent crawl success rates
npm run crawl:history 20

# Look for failed jobs
npm run crawl:history 50 | grep "failed"
```

### Troubleshooting

Common issues and solutions:

1. **Browser crashes**: Restart the crawler process
2. **Rate limiting**: Increase delays in `crawlerSettings`
3. **Selector failures**: Update CSS selectors for changed websites
4. **DynamoDB errors**: Check AWS credentials and permissions

## Best Practices

### Respectful Crawling

- **Rate limiting**: Built-in delays between requests
- **User agent**: Identifies the crawler to websites
- **Robots.txt**: Respects website crawling policies
- **Concurrent limits**: Prevents overwhelming target servers

### Data Quality

- **Duplicate detection**: Prevents duplicate events
- **Validation**: Ensures required fields are present
- **Normalization**: Standardizes dates, categories, and costs
- **Error handling**: Graceful degradation for missing data

### Performance

- **Efficient selectors**: Optimized CSS selectors for speed
- **Batch processing**: Processes multiple events efficiently
- **Memory management**: Proper cleanup of browser resources
- **Timeout handling**: Prevents hanging on slow pages

## Legal & Ethical Considerations

- **Terms of service**: Respect website terms and conditions
- **Rate limiting**: Don't overwhelm target servers
- **Data usage**: Only collect publicly available information
- **Attribution**: Properly credit event sources
- **Privacy**: Don't collect personal information

## Support

For issues or questions:

1. Check the crawl history for error details
2. Review website selectors for changes
3. Verify AWS credentials and permissions
4. Check network connectivity and firewall settings

## Contributing

To improve the crawler:

1. **Add new sources**: Follow the configuration pattern above
2. **Improve selectors**: Test and refine CSS selectors
3. **Enhance parsing**: Add new date formats or category mappings
4. **Performance**: Optimize crawling speed and efficiency
5. **Monitoring**: Add better logging and metrics

---

**Note**: This crawler is designed for educational and legitimate event discovery purposes. Always respect website terms of service and implement appropriate rate limiting.
