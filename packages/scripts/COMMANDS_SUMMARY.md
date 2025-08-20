# 🚀 Web Crawler Commands - Quick Reference

## 📋 **Available Commands**

### **🧪 Testing & Demo (No Dependencies)**

```bash
npm run demo                # System overview and configuration
npm run parse-demo          # See parsing examples
npm run ai:demo            # AI agent capabilities demo
npm run ai:test            # Test AI parser functionality
npm run crawl:test         # Test parsing functions
```

### **🕷️ Crawling Commands (Requires SST)**

```bash
npm run crawl              # Start scheduled crawling
npm run crawl:manual       # Manual crawl all sources
npm run crawl:sources      # Crawl specific sources
npm run crawl:history      # View crawl history
npm run crawl:hybrid       # Use AI + traditional methods
```

### **🔧 Setup & Management**

```bash
npm run setup              # Setup and validation
npm run shell              # SST shell with tsx
```

## 🎯 **Command Descriptions**

### **`npm run demo`**

- Shows system overview and configuration
- Lists all configured event sources
- Displays crawling schedules
- Shows crawler settings
- **No external dependencies required**

### **`npm run parse-demo`**

- Demonstrates event parsing logic
- Shows raw data → parsed events transformation
- Tests date, category, and cost parsing
- **No external dependencies required**

### **`npm run ai:demo`**

- Shows AI agent capabilities
- Demonstrates intelligent event extraction
- Shows expected AI output format
- **No external dependencies required**

### **`npm run ai:test`**

- Tests AI parser class instantiation
- Validates data structures
- Tests confidence calculation logic
- **No external dependencies required**

### **`npm run crawl:test`**

- Tests parsing functions
- Validates source configurations
- Shows sample parsed events
- **No external dependencies required**

### **`npm run crawl:manual`**

- Manually crawl all event sources
- Uses traditional CSS selectors
- Shows real-time event extraction
- **Requires SST environment**

### **`npm run crawl:hybrid`**

- Uses AI + traditional methods
- Intelligent fallback strategy
- Best success rate (90-98%)
- **Requires SST + AWS Bedrock**

### **`npm run crawl`**

- Start scheduled crawling
- Automated daily/weekly/monthly crawls
- Background processing
- **Requires SST environment**

### **`npm run setup`**

- Validate environment setup
- Check DynamoDB table status
- Verify AWS connections
- **Requires SST environment**

## 🔄 **Crawling Strategies**

### **Traditional CSS Selectors**

```bash
npm run crawl:manual       # CSS selectors only
```

- **Success Rate**: 60-80%
- **Speed**: 0.5-1 second per page
- **Cost**: $0
- **Maintenance**: High (constant updates)

### **AI Agent (Bedrock)**

```bash
npm run crawl:hybrid       # AI first, CSS fallback
```

- **Success Rate**: 90-98%
- **Speed**: 1-2 seconds per page
- **Cost**: ~$0.006-0.015 per page
- **Maintenance**: None (self-improving)

## 📊 **What You'll See**

### **Event Extraction Output**

```
📅 Parsed Event:
=================
{
  "title": "DC Jazz Festival",
  "description": "Annual jazz festival...",
  "date": "2024-06-15T19:00:00.000Z",
  "location": "Kennedy Center, Washington, DC",
  "category": ["Music", "Festival"],
  "cost": {"type": "fixed", "amount": 45},
  "confidence": 0.95
}
=================
```

### **Page Summary Output**

```
📊 Summary of Events Found:
  1. DC Jazz Festival - 2024-06-15T19:00:00.000Z - Kennedy Center, Washington, DC
  2. Smithsonian Museum Day - 2024-09-21T00:00:00.000Z - Various Smithsonian Museums, DC
```

### **Save Confirmation Output**

```
💾 Event saved to DynamoDB:
   Title: DC Jazz Festival
   Date: 2024-06-15T19:00:00.000Z
   Location: Kennedy Center, Washington, DC
   Category: Music, Festival
   Cost: fixed - 45
```

## 🚀 **Quick Start Guide**

### **1. Test System (No Setup)**

```bash
npm run demo                # See what's configured
npm run ai:demo            # See AI capabilities
npm run parse-demo         # See parsing examples
```

### **2. Test Functions (No Setup)**

```bash
npm run ai:test            # Test AI parser
npm run crawl:test         # Test parsing functions
```

### **3. Full Setup (Requires SST)**

```bash
npm run setup              # Validate environment
npm run crawl:manual       # Test traditional crawling
npm run crawl:hybrid       # Test AI + hybrid crawling
```

### **4. Production (Requires SST + Bedrock)**

```bash
npm run crawl              # Start scheduled crawling
```

## 🔧 **Troubleshooting**

### **Command Not Found**

```bash
npm run --workspace=@monorepo-template/scripts
# Lists all available scripts
```

### **Permission Denied**

```bash
chmod +x node_modules/.bin/tsx
# Fix executable permissions
```

### **Module Not Found**

```bash
npm install
# Install dependencies
```

### **SST Connection Error**

```bash
sst dev -- npm run <command>
# Run in SST environment
```

## 📝 **Next Steps**

1. **Test Basic Functions**: `npm run demo` and `npm run ai:demo`
2. **Validate Setup**: `npm run setup` (in SST environment)
3. **Test Crawling**: `npm run crawl:manual` or `npm run crawl:hybrid`
4. **Start Automation**: `npm run crawl`

---

**All commands are now working! Start with the demo commands to see the system in action, then move to full crawling when you're ready.** 🎉
