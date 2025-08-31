import { Client } from "@opensearch-project/opensearch";
import { Resource } from "sst";

async function testOpenSearchSearch() {
  console.log("🔍 Testing OpenSearch Search Functionality");
  console.log("==========================================");

  const client = new Client({
    node: Resource.MySearch.url,
    auth: {
      username: Resource.MySearch.username,
      password: Resource.MySearch.password,
    },
  });

  const indexName = "events-groups-index";

  try {
    // Test 1: Basic search
    console.log("\n🧪 Test 1: Basic search for 'running'");
    const basicSearch = await client.search({
      index: indexName,
      body: {
        query: {
          multi_match: {
            query: "running",
            fields: ["title^3", "description^2", "category.text^2"],
            type: "best_fields",
            fuzziness: "AUTO",
          },
        },
        size: 5,
      },
    });

    console.log(`✅ Found ${basicSearch.body.hits.total.value} results`);
    if (basicSearch.body.hits.hits.length > 0) {
      console.log("📋 Sample results:");
      basicSearch.body.hits.hits.slice(0, 3).forEach((hit: any, i: number) => {
        console.log(`  ${i + 1}. ${hit._source.title} (${hit._source.type})`);
        console.log(`     Categories: ${JSON.stringify(hit._source.category)}`);
      });
    }

    // Test 2: Category filter
    console.log("\n🧪 Test 2: Search for events in 'Sports' category");
    const categorySearch = await client.search({
      index: indexName,
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
      },
    });

    console.log(
      `✅ Found ${categorySearch.body.hits.total.value} results in Sports category`
    );

    // Test 3: Fuzzy search with typo
    console.log("\n🧪 Test 3: Fuzzy search for 'runnig' (typo)");
    const fuzzySearch = await client.search({
      index: indexName,
      body: {
        query: {
          multi_match: {
            query: "runnig",
            fields: ["title^3", "description^2", "category.text^2"],
            type: "best_fields",
            fuzziness: "AUTO",
          },
        },
        size: 5,
      },
    });

    console.log(
      `✅ Found ${fuzzySearch.body.hits.total.value} results with fuzzy matching`
    );

    // Test 4: Cost range search
    console.log("\n🧪 Test 4: Search for free events");
    const freeSearch = await client.search({
      index: indexName,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  "cost.type": "free",
                },
              },
            ],
          },
        },
        size: 5,
      },
    });

    console.log(`✅ Found ${freeSearch.body.hits.total.value} free events`);

    // Test 5: Location search
    console.log("\n🧪 Test 5: Search for events in 'DC'");
    const locationSearch = await client.search({
      index: indexName,
      body: {
        query: {
          multi_match: {
            query: "DC",
            fields: ["location^2", "venue^2", "title"],
          },
        },
        size: 5,
      },
    });

    console.log(
      `✅ Found ${locationSearch.body.hits.total.value} events in DC`
    );

    // Test 6: Complex search
    console.log("\n🧪 Test 6: Complex search - running events in DC");
    const complexSearch = await client.search({
      index: indexName,
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: "running",
                  fields: ["title^3", "description^2"],
                },
              },
            ],
            filter: [
              {
                multi_match: {
                  query: "DC",
                  fields: ["location", "venue"],
                },
              },
            ],
          },
        },
        size: 5,
      },
    });

    console.log(
      `✅ Found ${complexSearch.body.hits.total.value} running events in DC`
    );

    // Test 7: Get all unique categories
    console.log("\n🧪 Test 7: Getting all unique categories");
    const aggSearch = await client.search({
      index: indexName,
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

    // Test 8: Get index stats
    console.log("\n🧪 Test 8: Index statistics");
    const stats = await client.indices.stats({
      index: indexName,
    });

    console.log(
      `📊 Total documents: ${
        stats.body.indices[indexName]?.total?.docs?.count || 0
      }`
    );
    console.log(
      `📊 Index size: ${
        (stats.body.indices[indexName]?.total?.store?.size_in_bytes || 0) / 1024
      } KB`
    );

    console.log("\n🎉 All search tests completed successfully!");
    console.log("✅ OpenSearch is working correctly and searchable!");
  } catch (error) {
    console.error("❌ Search test failed:", error);
    process.exit(1);
  }
}

// Run the test
testOpenSearchSearch().catch(console.error);
