FROM apify/actor-node-puppeteer-chrome:20

# Switch to root for package installation
USER root

# Install additional dependencies if needed
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy crawler package.json to install dependencies
COPY packages/tasks/crawlers/package.json ./package.json

# Install dependencies
RUN npm install

# Install playwright globally to ensure it's available for crawlee
RUN npm install -g playwright

# Install Playwright browsers
RUN npx playwright install chromium

# Copy the crawler code directly to root
COPY packages/tasks/crawlers/washingtonian-selenium.ts ./
COPY packages/tasks/crawlers/washingtonian.ts ./

# Copy the runner script
COPY packages/tasks/crawlers/run-crawler.sh ./

# Make runner script executable
RUN chmod +x ./run-crawler.sh

# Set the default command
CMD ["npx", "tsx", "./washingtonian-selenium.ts"]