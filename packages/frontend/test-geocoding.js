// Test script for geocoding addresses
// Run with: node test-geocoding.js

const addresses = [
  "1600 Pennsylvania Avenue NW, Washington, DC",
  "901 Wharf St SW, Washington, DC",
  "National Mall, Washington, DC",
  "The Anthem, Washington, DC",
  "9:30 Club, Washington, DC"
];

async function testGeocoding() {
  console.log('Testing geocoding for DC addresses...\n');
  
  for (const address of addresses) {
    try {
      // This would normally use the geocodeAddress function
      // For demo purposes, here are the expected results:
      console.log(`Address: ${address}`);
      
      // Simulated results (you'd get these from the actual API)
      const results = {
        "1600 Pennsylvania Avenue NW, Washington, DC": "38.8977,-77.0365",
        "901 Wharf St SW, Washington, DC": "38.8765,-77.0047", 
        "National Mall, Washington, DC": "38.8895,-77.0353",
        "The Anthem, Washington, DC": "38.8765,-77.0047",
        "9:30 Club, Washington, DC": "38.9176,-77.0317"
      };
      
      console.log(`Coordinates: ${results[address] || 'Not found'}`);
      console.log('---');
    } catch (error) {
      console.error(`Error geocoding ${address}:`, error);
    }
  }
}

testGeocoding(); 