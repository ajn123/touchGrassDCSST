import { Client } from "@opensearch-project/opensearch";
import { Resource } from "sst";

async function testCategories() {
  console.log("🔍 Testing Category Search");
  console.log("==========================");

  const client = new Client({
    node: Resource.MySearch.url,
    auth: {
      username: Resource.MySearch.username,
      password: Resource.MySearch.password,
    },
  });

  const INDEX_NAME = "events-groups-index";

  try {
    // Test 1: Get all unique categories
    console.log("\n🧪 Test 1: Getting all unique categories");
    const aggSearch = await client.search({
      index: INDEX_NAME,
      body: {
        size: 0,
        aggs: {
          categories: {
            terms: { field: "category.keyword", size: 50 },
          },
        },
      },
    });

    const categories = aggSearch.body.aggregations?.categories?.buckets || [];
    console.log("📋 Categories found in index:");
    categories.forEach((bucket: any) => {
      console.log(`  - "${bucket.key}" (${bucket.doc_count} docs)`);
    });

    // Test 2: Search for events in 'Sports' category
    console.log("\n🧪 Test 2: Search for events in 'Sports' category");
    const categorySearch = await client.search({
      index: INDEX_NAME,
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: "running",
                  fields: ["title^3", "description^2", "category.text^2"],
                },
              },
            ],
            filter: [
              {
                terms: {
                  "category.keyword": ["Sports"],
                },
              },
            ],
          },
        },
        size: 5,
        _source: ["title", "category"],
      },
    });

    console.log(
      `✅ Found ${categorySearch.body.hits.total.value} results in Sports category`
    );
    if (categorySearch.body.hits.hits.length > 0) {
      console.log("📋 Sample results:");
      categorySearch.body.hits.hits.forEach((hit: any, i: number) => {
        console.log(`  ${i + 1}. ${hit._source.title}`);
        console.log(`     Categories: ${JSON.stringify(hit._source.category)}`);
      });
    }

    // Test 3: Search for events in multiple categories
    console.log(
      "\n🧪 Test 3: Search for events in 'Sports' or 'Fitness' categories"
    );
    const multiCategorySearch = await client.search({
      index: INDEX_NAME,
      body: {
        query: {
          terms: {
            "category.keyword": ["Sports", "Fitness"],
          },
        },
        size: 5,
        _source: ["title", "category"],
      },
    });

    console.log(
      `✅ Found ${multiCategorySearch.body.hits.total.value} results in Sports or Fitness categories`
    );
    if (multiCategorySearch.body.hits.hits.length > 0) {
      console.log("📋 Sample results:");
      multiCategorySearch.body.hits.hits.forEach((hit: any, i: number) => {
        console.log(`  ${i + 1}. ${hit._source.title}`);
        console.log(`     Categories: ${JSON.stringify(hit._source.category)}`);
      });
    }

    // Test 4: Show sample documents with their categories
    console.log("\n🧪 Test 4: Sample documents with categories");
    const sampleSearch = await client.search({
      index: INDEX_NAME,
      body: {
        query: { match_all: {} },
        size: 10,
        _source: ["title", "category", "type"],
      },
    });

    console.log(`📋 Sample documents:`);
    sampleSearch.body.hits.hits.forEach((hit: any, i: number) => {
      console.log(`  ${i + 1}. ${hit._source.title} (${hit._source.type})`);
      console.log(`     Categories: ${JSON.stringify(hit._source.category)}`);
    });

    console.log("\n🎉 Category tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testCategories().catch(console.error);
