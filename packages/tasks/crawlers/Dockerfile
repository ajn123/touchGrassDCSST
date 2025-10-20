FROM --platform=linux/amd64 node:20-slim

# Switch to root for package installation
USER root

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    unzip \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install Firefox
RUN apt-get update && apt-get install -y firefox-esr && rm -rf /var/lib/apt/lists/*

# Install GeckoDriver
RUN npm install -g geckodriver

# Set environment variables for Firefox
ENV FIREFOX_BIN=/usr/bin/firefox-esr
ENV FIREFOX_PATH=/usr/bin/firefox-esr

# Create app directory
WORKDIR /app

# Copy package files from project root
COPY ../../package*.json ./
COPY ../../packages/scripts/package.json ./packages/scripts/
COPY ../../packages/functions/package.json ./packages/functions/

# Install Node.js dependencies
RUN npm install
RUN cd packages/scripts && npm install
RUN cd packages/functions && npm install

# Install additional dependencies for Selenium
RUN npm install -g selenium-webdriver @sparticuz/chromium tsx

# Create the crawlers directory structure
RUN mkdir -p packages/tasks/crawlers

# Create Chrome user data directory
RUN mkdir -p /app/chrome-user-data

# Copy the crawler code (files are in current directory since build context is ./packages/tasks/crawlers)
COPY washingtonian-selenium.ts ./packages/tasks/crawlers/
COPY washingtonian.ts ./packages/tasks/crawlers/

# Copy the runner script
COPY run-crawler.sh /app/run-crawler.sh

# Make the script executable
RUN chmod +x /app/run-crawler.sh

# Verify the script was copied
RUN ls -la /app/run-crawler.sh

# Set the default command
CMD ["/app/run-crawler.sh"]