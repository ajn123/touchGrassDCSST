#!/usr/bin/env node

/**
 * Alternative migration script using fetch API
 * This script calls the POST /api/migrate-categories endpoint
 */

// Configuration
const config = {
  baseUrl: 'http://localhost:3000',
  endpoint: '/api/migrate-categories'
};

// Main migration function
async function runMigration() {
  console.log('🚀 Starting category record migration...');
  console.log(`📡 Making POST request to: ${config.baseUrl}${config.endpoint}`);
  console.log('⏳ This may take a while depending on the number of events...\n');
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${config.baseUrl}${config.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Category-Migration-Script/1.0'
      }
    });
    
    const totalTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Migration completed successfully!');
    console.log(`⏱️ Total time: ${totalTime}ms`);
    console.log(`📊 Status Code: ${response.status}`);
    console.log('\n📋 Response Details:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n🎉 Migration was successful!');
      if (data.result) {
        console.log(`📈 Events processed: ${data.result.migrated || 'Unknown'}`);
        console.log(`❌ Errors encountered: ${data.result.errors || 'Unknown'}`);
      }
    } else {
      console.log('\n⚠️ Migration completed but may have had issues');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed with error:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure your Next.js development server is running');
      console.log(`2. Verify the server is accessible at ${config.baseUrl}`);
      console.log('3. Check that the /api/migrate-categories endpoint exists');
      console.log('4. If using Node.js < 18, install node-fetch: npm install node-fetch');
    }
    
    process.exit(1);
  }
}

// Handle command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
      case '-u':
        config.baseUrl = args[i + 1] || 'http://localhost:3000';
        i++;
        break;
      case '--help':
        console.log(`
Category Migration Script (Fetch Version)

Usage: node migrate_categories_fetch.js [options]

Options:
  -u, --url <url>        Base URL of your server (default: http://localhost:3000)
  --help                  Show this help message

Examples:
  node migrate_categories_fetch.js
  node migrate_categories_fetch.js --url https://myapp.com
  node migrate_categories_fetch.js -u http://192.168.1.100:3001

Note: This script requires Node.js 18+ for native fetch support.
For older versions, install node-fetch: npm install node-fetch
        `);
        process.exit(0);
        break;
    }
  }
}

// Main execution
if (require.main === module) {
  parseArguments();
  runMigration();
}

module.exports = { runMigration };
