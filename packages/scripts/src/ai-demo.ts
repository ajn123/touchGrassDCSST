import { AIEventParser } from "./ai-event-parser";

// Demo script showing AI agent capabilities
async function demonstrateAIAgent() {
  console.log("🤖 AI Agent Event Parser Demo");
  console.log("==============================\n");

  try {
    // Sample website content that the AI would process
    const sampleWebsiteContent = `
      <html>
        <head><title>DC Events Calendar</title></head>
        <body>
          <h1>Washington DC Events</h1>
          
          <div class="event">
            <h2>DC Jazz Festival</h2>
            <p>Join us for the annual DC Jazz Festival featuring local and national artists. 
            The festival will take place on June 15, 2024 at 7:00 PM at the Kennedy Center 
            in Washington, DC. Tickets are $45 and include access to multiple performances 
            throughout the evening.</p>
            <p><strong>Date:</strong> June 15, 2024 at 7:00 PM</p>
            <p><strong>Location:</strong> Kennedy Center, Washington, DC</p>
            <p><strong>Cost:</strong> $45</p>
          </div>

          <div class="event">
            <h2>Smithsonian Museum Day</h2>
            <p>Free admission to all Smithsonian museums on September 21, 2024. 
            Special exhibitions, guided tours, and family activities available. 
            Various locations across Washington, DC including the National Air and Space Museum, 
            National Museum of American History, and more.</p>
            <p><strong>Date:</strong> September 21, 2024</p>
            <p><strong>Location:</strong> Various Smithsonian Museums, DC</p>
            <p><strong>Cost:</strong> Free</p>
          </div>

          <div class="event">
            <h2>Capital Pride Parade</h2>
            <p>Annual pride celebration and parade through the streets of Washington, DC. 
            The parade will start at 3:00 PM on June 8, 2024, beginning at Pennsylvania Avenue 
            and proceeding through downtown. All are welcome to join the celebration!</p>
            <p><strong>Date:</strong> June 8, 2024 at 3:00 PM</p>
            <p><strong>Location:</strong> Pennsylvania Avenue, Washington, DC</p>
            <p><strong>Cost:</strong> No cost</p>
          </div>

          <div class="event">
            <h2>DC United vs NY Red Bulls</h2>
            <p>MLS soccer match between DC United and NY Red Bulls at Audi Field. 
            Game starts at 3:00 PM on March 23, 2024. Tickets range from $25 to $150 
            depending on seating location. Come support your local team!</p>
            <p><strong>Date:</strong> March 23, 2024 at 3:00 PM</p>
            <p><strong>Location:</strong> Audi Field, Washington, DC</p>
            <p><strong>Cost:</strong> $25-150</p>
          </div>

          <div class="event">
            <h2>National Cherry Blossom Festival</h2>
            <p>Celebrate spring in Washington, DC with the annual cherry blossom festival. 
            Events include the parade on April 13, 2024, cultural performances, 
            and guided tours of the Tidal Basin. The festival runs from March 20 to April 14, 2024.</p>
            <p><strong>Date:</strong> March 20 - April 14, 2024</p>
            <p><strong>Location:</strong> Tidal Basin, Washington, DC</p>
            <p><strong>Cost:</strong> Free</p>
          </div>

          <div class="info">
            <h3>About DC Events</h3>
            <p>Washington, DC offers a wide variety of events throughout the year. 
            From cultural festivals to sports events, there's always something happening 
            in the nation's capital.</p>
            <p><strong>Contact:</strong> info@dcevents.com</p>
            <p><strong>Phone:</strong> (202) 555-0123</p>
          </div>
        </body>
      </html>
    `;

    console.log("📝 Sample Website Content:");
    console.log("============================");
    console.log("This is the type of HTML content the AI agent would process:");
    console.log(sampleWebsiteContent.substring(0, 500) + "...");
    console.log("\n" + "=".repeat(60));

    // Simulate what the AI agent would extract
    console.log("\n🤖 AI Agent Analysis:");
    console.log("=====================");
    
    // Show what the AI prompt would look like
    console.log("📋 AI Prompt (simplified):");
    console.log("You are an expert event extraction AI agent. Analyze the website content");
    console.log("and extract all events mentioned. Return results in valid JSON format.");
    console.log("Be thorough but accurate - only extract real events.");
    console.log("\n" + "=".repeat(60));

    // Show expected AI output
    console.log("\n📊 Expected AI Agent Output:");
    console.log("=============================");
    
    const expectedEvents = [
      {
        title: "DC Jazz Festival",
        description: "Join us for the annual DC Jazz Festival featuring local and national artists. The festival will take place on June 15, 2024 at 7:00 PM at the Kennedy Center in Washington, DC. Tickets are $45 and include access to multiple performances throughout the evening.",
        location: "Kennedy Center, Washington, DC",
        date: "2024-06-15T19:00:00.000Z",
        start_date: "2024-06-15",
        category: ["Music", "Festival"],
        cost: {
          type: "fixed",
          currency: "USD",
          amount: 45
        },
        venue: "Kennedy Center",
        confidence: 0.95
      },
      {
        title: "Smithsonian Museum Day",
        description: "Free admission to all Smithsonian museums on September 21, 2024. Special exhibitions, guided tours, and family activities available. Various locations across Washington, DC including the National Air and Space Museum, National Museum of American History, and more.",
        location: "Various Smithsonian Museums, DC",
        date: "2024-09-21T00:00:00.000Z",
        start_date: "2024-09-21",
        category: ["Museum", "Education"],
        cost: {
          type: "free",
          currency: "USD",
          amount: 0
        },
        venue: "Various Smithsonian Museums",
        confidence: 0.98
      },
      {
        title: "Capital Pride Parade",
        description: "Annual pride celebration and parade through the streets of Washington, DC. The parade will start at 3:00 PM on June 8, 2024, beginning at Pennsylvania Avenue and proceeding through downtown. All are welcome to join the celebration!",
        location: "Pennsylvania Avenue, Washington, DC",
        date: "2024-06-08T15:00:00.000Z",
        start_date: "2024-06-08",
        category: ["Festival", "Community"],
        cost: {
          type: "free",
          currency: "USD",
          amount: 0
        },
        venue: "Pennsylvania Avenue",
        confidence: 0.92
      },
      {
        title: "DC United vs NY Red Bulls",
        description: "MLS soccer match between DC United and NY Red Bulls at Audi Field. Game starts at 3:00 PM on March 23, 2024. Tickets range from $25 to $150 depending on seating location. Come support your local team!",
        location: "Audi Field, Washington, DC",
        date: "2024-03-23T15:00:00.000Z",
        start_date: "2024-03-23",
        category: ["Sports", "Soccer"],
        cost: {
          type: "variable",
          currency: "USD",
          amount: "25-150"
        },
        venue: "Audi Field",
        confidence: 0.94
      },
      {
        title: "National Cherry Blossom Festival",
        description: "Celebrate spring in Washington, DC with the annual cherry blossom festival. Events include the parade on April 13, 2024, cultural performances, and guided tours of the Tidal Basin. The festival runs from March 20 to April 14, 2024.",
        location: "Tidal Basin, Washington, DC",
        date: "2024-03-20T00:00:00.000Z",
        start_date: "2024-03-20",
        end_date: "2024-04-14",
        category: ["Festival", "Cultural"],
        cost: {
          type: "free",
          currency: "USD",
          amount: 0
        },
        venue: "Tidal Basin",
        confidence: 0.96
      }
    ];

    expectedEvents.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.title}`);
      console.log(`   📅 Date: ${event.start_date}${event.end_date ? ` - ${event.end_date}` : ''}`);
      console.log(`   📍 Location: ${event.location}`);
      console.log(`   🏷️ Category: ${event.category.join(", ")}`);
      console.log(`   💰 Cost: ${event.cost.type === "free" ? "Free" : `$${event.cost.amount}`}`);
      console.log(`   🎯 Confidence: ${event.confidence}`);
      console.log(`   📝 Description: ${event.description.substring(0, 100)}...`);
    });

    // Show metadata
    console.log("\n📊 AI Agent Metadata:");
    console.log("=====================");
    console.log(`   Total Events: ${expectedEvents.length}`);
    console.log(`   Overall Confidence: ${(expectedEvents.reduce((sum, e) => sum + e.confidence, 0) / expectedEvents.length).toFixed(2)}`);
    console.log(`   Extraction Method: AI Agent (Bedrock)`);
    console.log(`   Processing Time: ~2000ms (estimated)`);

    // Show advantages of AI approach
    console.log("\n🚀 AI Agent Advantages:");
    console.log("=======================");
    console.log("✅ **Intelligent Parsing**: Understands context and meaning");
    console.log("✅ **Flexible Extraction**: Works with any website structure");
    console.log("✅ **Confidence Scoring**: Knows how reliable each extraction is");
    console.log("✅ **Natural Language**: Handles various text formats");
    console.log("✅ **Self-Improving**: Gets better with more examples");
    console.log("✅ **No Selector Maintenance**: Works even when websites change");

    console.log("\n✅ AI Agent demonstration completed!");
    console.log("\n📝 To use the AI agent:");
    console.log("1. Install dependencies: npm install");
    console.log("2. Set up AWS Bedrock access");
    console.log("3. Run hybrid crawler: npm run crawl:hybrid");
    console.log("4. Or test AI parsing: npm run ai:test");

  } catch (error) {
    console.error("❌ AI demonstration failed:", error);
  }
}

// Run demonstration
demonstrateAIAgent().catch(console.error);
