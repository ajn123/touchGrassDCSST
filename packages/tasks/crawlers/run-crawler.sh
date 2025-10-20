#!/bin/bash

echo "Starting Washingtonian Selenium Crawler..."

# Change to the crawlers directory
cd packages/tasks/crawlers

# Run the crawler
npx tsx washingtonian-selenium.ts

echo "Crawler completed!"
