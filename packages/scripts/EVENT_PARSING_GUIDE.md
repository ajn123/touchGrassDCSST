# 📅 Event Parsing Guide - See Events as They're Parsed

## 🎯 **What You'll See Now**

When you run the crawler scripts, you'll now see **detailed output** of every event that gets parsed, including:

- **Raw data** extracted from websites
- **Parsed events** with normalized data
- **Event summaries** as they're processed
- **Final saved events** going to DynamoDB

## 🚀 **Available Commands**

### **1. See Parsing in Action (No Dependencies)**

```bash
npm run parse-demo          # Shows how raw data becomes parsed events
npm run crawl:test          # Tests parsing functions + shows sample event
npm run demo                # Shows system overview and configuration
```

### **2. Full Crawling (Requires SST)**

```bash
npm run setup               # Setup and validation
npm run crawl:manual        # Manual crawl with event printing
npm run crawl               # Scheduled crawling with event printing
npm run crawl:sources [names] # Crawl specific sources with event printing
```

## 📊 **What You'll See When Crawling**

### **During Event Extraction**

```
📅 Parsed Event:
=================
{
  "title": "DC Jazz Festival",
  "description": "Annual jazz festival featuring local and national artists",
  "location": "Kennedy Center, Washington, DC",
  "date": "2024-06-15T04:00:00.000Z",
  "start_date": "2024-06-15",
  "category": "Music",
  "cost": {
    "type": "fixed",
    "currency": "USD",
    "amount": 45
  },
  "is_public": true
}
=================
```

### **After Processing Each Page**

```
📊 Summary of Events Found:
  1. DC Jazz Festival - 2024-06-15T04:00:00.000Z - Kennedy Center, Washington, DC
  2. Smithsonian Museum Day - 2024-09-21T04:00:00.000Z - Various Smithsonian Museums, DC
  3. Capital Pride Parade - 2024-06-08T00:00:00.000Z - Pennsylvania Avenue, Washington, DC
```

### **When Saving to DynamoDB**

```
💾 Event saved to DynamoDB:
   Title: DC Jazz Festival
   Date: 2024-06-15T04:00:00.000Z
   Location: Kennedy Center, Washington, DC
   Category: Music
   Cost: fixed - 45
```

## 🧪 **Test the Parsing Right Now**

### **Quick Demo (No Setup Required)**

```bash
npm run parse-demo
```

This shows you exactly how the crawler will process real event data:

1. **Raw data** from websites
2. **Date parsing** (4+ formats supported)
3. **Category mapping** (smart standardization)
4. **Cost parsing** (free, fixed, variable)
5. **Final structured events** ready for DynamoDB

### **Sample Output**

```
📝 Sample Raw Event Data:
==========================

1. DC Jazz Festival
   Raw Date: June 15, 2024 at 7:00 PM
   Raw Location: Kennedy Center, Washington, DC
   Raw Category: jazz concert
   Raw Cost: $45

🔧 Parsing Results:
===================

1. DC Jazz Festival
   📅 Parsed Date: 2024-06-15T04:00:00.000Z
   🏷️ Parsed Category: Music
   💰 Parsed Cost: {"type":"fixed","currency":"USD","amount":45}
   📊 Final Parsed Event: {...}
```

## 🔍 **What Gets Parsed**

### **Date Formats Supported**

- ✅ `March 15, 2024` → `2024-03-15T04:00:00.000Z`
- ✅ `Mar 15, 2024` → `2024-03-15T04:00:00.000Z`
- ✅ `2024-03-15` → `2024-03-15T00:00:00.000Z`
- ✅ `March 15, 2024 at 7:00 PM` → `2024-03-15T04:00:00.000Z`

### **Category Mapping**

- ✅ `jazz concert` → `Music`
- ✅ `festival parade` → `Festival`
- ✅ `soccer sports` → `Sports`
- ✅ `museum` → `Museum`

### **Cost Parsing**

- ✅ `Free` → `{"type":"free","currency":"USD","amount":0}`
- ✅ `$45` → `{"type":"fixed","currency":"USD","amount":45}`
- ✅ `$25-150` → `{"type":"variable","currency":"USD","amount":"25-150"}`

## 📋 **Event Data Structure**

Every parsed event will have this structure:

```typescript
{
  title: string;                    // Event title
  description?: string;             // Event description
  location?: string;                // Event location/venue
  date?: string;                    // ISO date string
  start_date?: string;              // Start date (YYYY-MM-DD)
  end_date?: string;                // End date (YYYY-MM-DD)
  category?: string | string[];     // Event category(ies)
  image_url?: string;               // Event image URL
  cost?: {                          // Cost information
    type: string;                   // 'free', 'fixed', 'variable'
    currency: string;               // Currency code
    amount: string | number;        // Cost amount or range
  };
  socials?: {                       // Social media links
    website?: string;               // Event website
    facebook?: string;              // Facebook page
    instagram?: string;             // Instagram account
    twitter?: string;               // Twitter account
  };
  venue?: string;                   // Venue name
  is_public?: boolean;              // Public visibility
}
```

## 🎬 **See It Live**

### **Step 1: Test Parsing (No Setup)**

```bash
npm run parse-demo
```

### **Step 2: Test Basic Functions**

```bash
npm run crawl:test
```

### **Step 3: See System Overview**

```bash
npm run demo
```

### **Step 4: Full Crawling (When Ready)**

```bash
# In SST environment
npm run setup
npm run crawl:manual
```

## 🔧 **Customization**

### **Add More Date Formats**

Edit `src/event-crawler.ts` in the `parseDate` function

### **Add More Categories**

Edit `src/event-crawler.ts` in the `mapCategory` function

### **Add More Cost Patterns**

Edit `src/event-crawler.ts` in the `parseCost` function

## 📝 **Next Steps**

1. **Test parsing**: `npm run parse-demo`
2. **Validate setup**: `npm run setup` (in SST environment)
3. **Test crawling**: `npm run crawl:manual`
4. **Start automation**: `npm run crawl`

---

**Now you can see exactly what events the crawler finds and how it processes them!** 🎉
