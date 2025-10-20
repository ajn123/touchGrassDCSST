#!/bin/bash

echo "🐳 Building Washingtonian Crawler Docker Image..."

# Build the Docker image
docker build -f packages/tasks/crawlers/Dockerfile -t washingtonian-crawler:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "🧪 Testing the crawler..."
    
    # Run the container
    docker run --rm \
        -e AWS_REGION=us-east-1 \
        -e CHROME_BIN=/opt/google/chrome/chrome \
        -e CHROME_PATH=/opt/google/chrome/chrome \
        washingtonian-crawler:latest
    
    echo ""
    echo "🎯 Test completed!"
else
    echo "❌ Docker build failed!"
    exit 1
fi
