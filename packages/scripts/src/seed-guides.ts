import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);

interface GuideData {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  sources: { title: string; url: string }[];
  places: { name: string; rating: number; address: string; website?: string }[];
  image_url?: string;
}

const FIRST_TIMERS_GUIDE: GuideData = {
  slug: "first-timers-guide-to-dc",
  title: "The First-Timer's Guide to Washington DC",
  excerpt:
    "Everything you need to know before your first trip to DC — getting around, must-see spots, the best neighborhoods, where to eat, and tips from locals who actually live here.",
  category: "Travel",
  image_url:
    "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=1200&h=630&fit=crop",
  sources: [
    { title: "r/washingtondc - First time visiting DC tips", url: "https://www.reddit.com/r/washingtondc/" },
    { title: "r/washingtondc - Best neighborhoods to explore", url: "https://www.reddit.com/r/washingtondc/" },
    { title: "r/washingtondc - Food recommendations", url: "https://www.reddit.com/r/washingtondc/" },
    { title: "Washington.org Official Visitor Guide", url: "https://washington.org" },
    { title: "Smithsonian Institution", url: "https://www.si.edu" },
  ],
  places: [
    { name: "Ben's Chili Bowl", rating: 4.3, address: "1213 U St NW, Washington, DC 20009", website: "https://benschilibowl.com" },
    { name: "The National Mall", rating: 4.8, address: "National Mall, Washington, DC 20565" },
    { name: "Georgetown Waterfront", rating: 4.5, address: "Georgetown Waterfront Park, Washington, DC 20007" },
    { name: "Eastern Market", rating: 4.6, address: "225 7th St SE, Washington, DC 20003", website: "https://easternmarket-dc.org" },
    { name: "Adams Morgan", rating: 4.4, address: "Adams Morgan, Washington, DC 20009" },
    { name: "The Wharf", rating: 4.5, address: "The Wharf, Washington, DC 20024", website: "https://www.wharfdc.com" },
    { name: "Dupont Circle", rating: 4.5, address: "Dupont Circle, Washington, DC 20036" },
    { name: "Union Market", rating: 4.4, address: "1309 5th St NE, Washington, DC 20002", website: "https://unionmarketdc.com" },
    { name: "DC Improv", rating: 4.7, address: "1140 Connecticut Ave NW, Washington, DC 20036", website: "https://dcimprov.com" },
    { name: "Old Town Alexandria", rating: 4.7, address: "King Street, Alexandria, VA 22314" },
  ],
  content: `
<h2 id="getting-around">Getting Around DC</h2>

<p>Washington DC is one of the most walkable cities in America, and the public transit system (WMATA Metro) is excellent for visitors. Here's what you need to know:</p>

<p><strong>The Metro</strong> is your best friend. It's clean, safe, and connects all the major tourist areas. Get a <strong>SmarTrip card</strong> at any station kiosk — you can also use Apple Pay or Google Pay directly at the turnstiles now. Fares vary by distance and time of day (peak vs. off-peak), but expect to pay $2-6 per trip.</p>

<p><strong>Pro tips from locals:</strong></p>
<ul>
  <li>Stand on the <strong>right side</strong> of escalators, walk on the left. This is not optional — you will get dirty looks (or worse) if you block the left side.</li>
  <li>The Metro closes around midnight on weekdays and 1 AM on weekends. Plan accordingly.</li>
  <li>Yellow/Green lines are your best bet for getting between major neighborhoods quickly.</li>
  <li>Don't rely solely on Metro — walking between attractions on the Mall is often faster than transferring lines.</li>
</ul>

<p><strong>You don't need a car.</strong> Seriously. Parking is expensive ($25-45/day), traffic is terrible, and everything worth seeing is accessible by Metro, bus, or a short walk. If you need a ride somewhere specific, use Uber/Lyft.</p>

<p><strong>Biking</strong> is popular too. Capital Bikeshare has stations everywhere — a day pass is $8 and gets you unlimited 30-minute rides.</p>

<h2 id="national-mall">The National Mall & Monuments</h2>

<p>The Mall is the heart of DC and probably the reason you're visiting. It stretches about 2 miles from the Capitol Building to the Lincoln Memorial, with monuments, memorials, and museums lining both sides. <strong>It's all free.</strong></p>

<p><strong>Must-sees (in walking order from east to west):</strong></p>
<ul>
  <li><strong>U.S. Capitol Building</strong> — free tours available, book online in advance</li>
  <li><strong>National Gallery of Art</strong> — world-class collection, completely free</li>
  <li><strong>National Air and Space Museum</strong> — recently renovated and better than ever</li>
  <li><strong>Washington Monument</strong> — free timed tickets required, book on recreation.gov</li>
  <li><strong>World War II Memorial</strong> — stunning, especially at night</li>
  <li><strong>Lincoln Memorial</strong> — the iconic endpoint, best at sunrise or sunset</li>
  <li><strong>Vietnam Veterans Memorial</strong> — powerful and moving, right next to Lincoln</li>
</ul>

<p><strong>Timing tips:</strong></p>
<ul>
  <li>Start early (8-9 AM) to beat crowds and heat in summer.</li>
  <li>The monuments are open 24/7 and are <strong>spectacular at night</strong> when lit up. A nighttime walk from Lincoln Memorial to the Capitol is unforgettable.</li>
  <li>Budget at least a full day for the Mall — two days if you want to go inside museums.</li>
  <li>Wear comfortable shoes. You'll walk 15,000-25,000 steps on a Mall day.</li>
</ul>

<h2 id="museums">Smithsonian Museums</h2>

<p>DC has the best free museums in the world, and it's not even close. The Smithsonian Institution operates 21 museums — all free, all incredible. Here are the top picks:</p>

<p><strong>1. National Museum of African American History & Culture (NMAAHC)</strong> — The most in-demand museum in DC. <strong>You need timed-entry passes</strong>, released on a rolling basis at nmaahc.si.edu. Set an alarm and grab them as soon as they drop. This museum is extraordinary — plan at least 3-4 hours.</p>

<p><strong>2. National Air and Space Museum</strong> — Recently completed a massive renovation. Moon rocks, the Wright Flyer, SR-71 Blackbird, space shuttles. Great for all ages. The Udvar-Hazy Center annex near Dulles Airport has even more, including a Space Shuttle Discovery.</p>

<p><strong>3. National Museum of Natural History</strong> — The Hope Diamond, dinosaur halls, ocean exhibits. Perfect rainy day activity. Can get crowded on weekends — go on a weekday morning.</p>

<p><strong>4. National Gallery of Art</strong> — Not technically Smithsonian but still free. The West Building has classical masterpieces; the East Building (I.M. Pei's angular masterpiece) has modern art. Don't miss the underground tunnel connecting them.</p>

<p><strong>5. National Museum of American History</strong> — The Star-Spangled Banner, Dorothy's ruby slippers, Julia Child's kitchen, and Kermit the Frog. More fun than you'd expect.</p>

<p><strong>Skip-the-line tips:</strong> Most Smithsonians don't require tickets (except NMAAHC). Arrive right at opening (10 AM) or after 2 PM when school groups leave. Weekday mornings are least crowded.</p>

<h2 id="neighborhoods">Neighborhoods to Explore</h2>

<p>DC is a city of neighborhoods, each with its own personality. Don't spend your entire trip on the Mall — the neighborhoods are where you'll find the real DC.</p>

<p><strong>Georgetown</strong> — Cobblestone streets, boutique shopping, Georgetown Waterfront Park along the Potomac. Great for a sunset walk. Hit up the C&O Canal towpath for a peaceful stroll. Best dessert: Baked & Wired (way better than Georgetown Cupcake, locals will tell you).</p>

<p><strong>Adams Morgan</strong> — DC's most eclectic neighborhood. Amazing international food (Ethiopian, Salvadoran, Vietnamese), vibrant nightlife, colorful murals. 18th Street is the main drag. Weekend brunch here is a move.</p>

<p><strong>U Street / 14th Street Corridor</strong> — The cultural heart of Black DC (historically known as "Black Broadway"). Live music venues, incredible restaurants, and some of the best nightlife in the city. Ben's Chili Bowl is the iconic stop, but the whole strip is worth exploring.</p>

<p><strong>Capitol Hill</strong> — Think row houses, tree-lined streets, and Eastern Market (open weekends) with local vendors, food, and art. Great for brunch at the Market Lunch counter — get the blueberry buckwheat pancakes.</p>

<p><strong>Navy Yard / The Wharf</strong> — DC's waterfront neighborhoods. The Wharf has restaurants, live music, and boat tours. Navy Yard is great on game days when the Nationals or DC United are playing. Both are newer developments with a more modern feel.</p>

<p><strong>H Street NE (Atlas District)</strong> — A bit off the beaten path but worth the trip. Dive bars, live music, excellent food (Toki Underground for ramen, Maketto for Cambodian-Taiwanese). The streetcar runs the length of H Street.</p>

<p><strong>Dupont Circle</strong> — Embassies, brownstones, bookshops, and the Sunday farmers market. More chill than other nightlife neighborhoods. Kramerbooks & Afterwords is an institution.</p>

<h2 id="food-and-drink">Food & Drink Essentials</h2>

<p>DC's food scene has exploded in the last decade. It's now legitimately one of the best food cities on the East Coast. Here's what you need to know:</p>

<p><strong>DC Originals:</strong></p>
<ul>
  <li><strong>Mumbo sauce</strong> — A sweet, tangy, slightly spicy condiment unique to DC. Get it on chicken wings from any carryout spot. If you want the authentic experience, go to a Chinese carryout in Southeast or Northeast DC.</li>
  <li><strong>Half-smokes</strong> — A spicier, larger version of a hot dog. Ben's Chili Bowl is the famous spot, but locals also love DC-3 on Pennsylvania Ave SE.</li>
  <li><strong>Ethiopian food</strong> — DC has the largest Ethiopian population outside of Ethiopia. U Street is Ethiopian food paradise. Try Dukem, Zenebech, or Chercher for an incredible injera spread.</li>
</ul>

<p><strong>Can't-miss food neighborhoods:</strong></p>
<ul>
  <li><strong>14th Street NW</strong> — Trendy restaurants wall-to-wall. Le Diplomate (French bistro) always has a line for a reason.</li>
  <li><strong>Union Market (NoMa)</strong> — Indoor food hall with incredible variety. Arepa Zone, Takorean, and more.</li>
  <li><strong>The Wharf</strong> — Seafood with waterfront views. The fish market has been operating since 1805.</li>
</ul>

<p><strong>Happy hour culture:</strong> DC runs on happy hour. The workweek practically revolves around post-work drinks. Most restaurants offer solid happy hour deals from 4-7 PM. Some favorites: Off the Record (Hay-Adams Hotel for political sightings), Dan's Cafe (legendary dive bar — bring cash), and Service Bar (inventive cocktails).</p>

<h2 id="seasonal-tips">Seasonal Tips</h2>

<p><strong>Cherry Blossom Season (late March - early April):</strong> This is DC's biggest event. The Tidal Basin is surrounded by over 3,000 cherry trees that bloom in a gorgeous pink canopy. It's breathtaking — and packed. Go at sunrise (6-7 AM) to avoid crowds. The National Cherry Blossom Festival runs for several weeks with parades, events, and special activities. Check the <a href="https://touchgrassdc.com/search?q=cherry+blossom" target="_blank" rel="noopener noreferrer">TouchGrass DC events page</a> for festival listings.</p>

<p><strong>Summer (June - August):</strong> Hot. Humid. Brutal. Temperatures regularly hit 95°F+ with 80%+ humidity. Hydrate aggressively, take breaks in air-conditioned museums, and plan outdoor activities for early morning or evening. On the plus side: free outdoor concerts, Fourth of July on the Mall (get there EARLY), and Screen on the Green movie nights.</p>

<p><strong>Fall (September - November):</strong> The best time to visit. Comfortable temperatures, gorgeous fall foliage, and fewer crowds than spring/summer. Great Rock Creek Park for fall colors.</p>

<p><strong>Winter (December - February):</strong> Cold but manageable (30s-40s°F). Fewer tourists, shorter museum lines, and holiday markets. The National Christmas Tree lighting ceremony is a highlight. Ice skating at the National Gallery of Art Sculpture Garden is a must.</p>

<h2 id="hidden-gems">Hidden Gems</h2>

<p>These are the spots locals love that most tourists miss:</p>

<ul>
  <li><strong>The Exorcist Steps (Georgetown)</strong> — The famous stairs from the 1973 movie. Find them at 36th and Prospect St NW. Great photo op.</li>
  <li><strong>Dumbarton Oaks (Georgetown)</strong> — Stunning gardens and a Byzantine art collection. The gardens alone are worth the small admission fee.</li>
  <li><strong>The Phillips Collection (Dupont Circle)</strong> — America's first modern art museum. Renoir's Luncheon of the Boating Party is here.</li>
  <li><strong>Kenilworth Aquatic Gardens (Anacostia)</strong> — Lotus and water lily gardens that look like something out of Monet. Free, peaceful, and almost no tourists.</li>
  <li><strong>Roosevelt Island</strong> — A 91-acre island in the Potomac accessible by a footbridge from Rosslyn. Hiking trails, a memorial plaza, and complete escape from the city.</li>
  <li><strong>The Mansion on O Street (Dupont)</strong> — A bizarre, wonderful museum/hotel with 70+ secret doors. You have to experience it to believe it.</li>
  <li><strong>Big Bear Cafe (Bloomingdale)</strong> — The quintessential DC neighborhood coffee shop. Grab a coffee and walk to the nearby McMillan Reservoir for views.</li>
</ul>

<h2 id="nightlife">What to Do at Night</h2>

<p>DC's nightlife doesn't get enough credit. Here's the breakdown:</p>

<p><strong>Comedy:</strong> DC has a thriving comedy scene. <a href="https://touchgrassdc.com/comedy" target="_blank" rel="noopener noreferrer">DC Improv</a> is the flagship club (Seinfeld, Chappelle, and every major comedian has played here). The Comedy Loft above DC Improv is more intimate. Check <a href="https://touchgrassdc.com/comedy" target="_blank" rel="noopener noreferrer">our comedy page</a> for current shows.</p>

<p><strong>Live Music:</strong> The 9:30 Club is one of the best live music venues in America — period. The Anthem is the bigger sibling (6,000 capacity) right on The Wharf. For smaller shows: Songbyrd, Union Stage, and the Black Cat.</p>

<p><strong>Rooftop Bars:</strong> DC loves its rooftop bars. Top picks: POV at the W Hotel (views of the White House), Top of the Gate (at the Watergate — yes, that Watergate), and Takoda (Adams Morgan, more relaxed).</p>

<p><strong>Dive Bars:</strong> Dan's Cafe (Adams Morgan) is legendarily weird — they serve liquor in squeeze bottles. Madam's Organ (also Adams Morgan) has live blues and a giant mural. Showtime (U Street) and Ivy & Coney (Shaw) for chill vibes.</p>

<p><strong>Late Night Eats:</strong> Jumbo Slice (Adams Morgan) — massive $5 pizza slices that are a rite of passage at 2 AM. Amsterdam Falafelshop for late-night falafel. Diner (Adams Morgan) is open 24 hours on weekends.</p>

<h2 id="day-trips">Day Trips</h2>

<p>If you have extra days, these are worth the trip:</p>

<p><strong>Old Town Alexandria (20 min by Metro)</strong> — Charming waterfront town just across the river in Virginia. Cobblestone streets, independent shops, great restaurants, and the Torpedo Factory art center. Take the Yellow Line to King Street station, then the free trolley to the waterfront.</p>

<p><strong>Annapolis, MD (45 min drive)</strong> — Maryland's capital and home to the Naval Academy. Walk the historic downtown, eat crabs on the waterfront, and tour the Academy grounds. Best crabs: Cantler's Riverside Inn (cash only, worth it).</p>

<p><strong>Shenandoah National Park (1.5 hr drive)</strong> — Skyline Drive is one of the most scenic drives on the East Coast. Hike Old Rag Mountain if you want a challenge (one of the best hikes on the East Coast). Best in fall for foliage.</p>

<p><strong>Great Falls Park (30 min drive)</strong> — Dramatic waterfalls on the Potomac River, just outside DC. Both the Virginia side (Great Falls Park) and Maryland side (Billy Goat Trail) are excellent. The Billy Goat Trail is a local favorite hike — scrambling over rocks along the river.</p>

<h2 id="practical-tips">Practical Tips</h2>

<p><strong>Budget:</strong> DC can be surprisingly affordable if you lean into the free stuff. All Smithsonian museums are free, the Mall and monuments are free, and many events are free. Budget $50-80/day for food (more if you're dining out for every meal). Hotels are expensive — consider staying in Arlington or Alexandria (Virginia side, quick Metro ride) for lower rates.</p>

<p><strong>Safety:</strong> Like any major city, use common sense. The tourist areas (Mall, Georgetown, Dupont) are very safe. Avoid walking alone late at night in unfamiliar neighborhoods. The Metro is safe but be aware of your surroundings, especially on late-night trains.</p>

<p><strong>Weather prep:</strong></p>
<ul>
  <li><strong>Spring:</strong> Layers. It can swing 30 degrees in a day. Light jacket essential.</li>
  <li><strong>Summer:</strong> Sunscreen, water bottle, hat. The humidity is real.</li>
  <li><strong>Fall:</strong> Light layers, maybe a rain jacket. Perfect weather.</li>
  <li><strong>Winter:</strong> Warm coat, gloves, hat. Wind chill off the Potomac is no joke.</li>
</ul>

<p><strong>Best time to visit:</strong> Late September through November or late March through May. You get the best weather, events (cherry blossoms in spring, fall foliage), and manageable crowds. Avoid August if you hate humidity.</p>

<p><strong>One more thing:</strong> DC is more than monuments and politics. It's a real city with real neighborhoods, incredible food, and things happening every single night. Don't just do the tourist checklist — wander the neighborhoods, eat at a local spot, and catch a show. That's how you really experience DC.</p>

<p>Browse upcoming events on <a href="https://touchgrassdc.com/search?sortBy=date&sortOrder=asc" target="_blank" rel="noopener noreferrer">TouchGrass DC</a> to see what's happening during your visit, or <a href="https://touchgrassdc.com/groups" target="_blank" rel="noopener noreferrer">find a group</a> to join if you want to meet locals.</p>
`.trim(),
};

async function seedGuides() {
  const tableName = Resource.Db.name;
  console.log(`Seeding guides to table: ${tableName}`);

  const guides: GuideData[] = [FIRST_TIMERS_GUIDE];

  for (const guide of guides) {
    const pk = `GUIDE#${guide.slug}`;
    const sk = "GUIDE_INFO";

    // Check if already exists
    const existing = await docClient.send(
      new GetCommand({ TableName: tableName, Key: { pk, sk } })
    );

    if (existing.Item) {
      console.log(`  Skipping "${guide.title}" — already exists. Delete first to re-seed.`);
      continue;
    }

    const now = Date.now();
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk,
          sk,
          title: guide.title,
          slug: guide.slug,
          content: guide.content,
          excerpt: guide.excerpt,
          category: guide.category,
          sources: guide.sources,
          places: guide.places,
          image_url: guide.image_url,
          isPublic: "true",
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      })
    );
    console.log(`  Seeded "${guide.title}"`);
  }

  console.log("Done seeding guides.");
}

seedGuides().catch(console.error);
