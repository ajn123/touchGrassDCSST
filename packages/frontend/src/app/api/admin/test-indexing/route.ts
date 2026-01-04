import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
// OpenSearch removed - using DynamoDB with frontend filtering instead
// import { searchOpenSearch } from "@/lib/opensearch-actions";
// import { Client } from "@opensearch-project/opensearch";
// import { transformEventForOpenSearch } from "@touchgrass/shared-utils";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

// OpenSearch client removed
// const openSearchClient = new Client({
//   node: Resource.MySearch.url,
//   auth: {
//     username: Resource.MySearch.username,
//     password: Resource.MySearch.password,
//   },
// });

// const INDEX_NAME = "events-groups-index";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, testTitle } = body;

    const results: any = {
      steps: [],
      success: false,
      eventId: null,
      searchResults: null,
    };

    let createdTestEvent = false;

    // Step 1: Get event from DynamoDB
    let event: any = null;
    if (eventId) {
      results.steps.push({
        step: "fetch_event",
        status: "in_progress",
        message: `Fetching event ${eventId} from DynamoDB...`,
      });

      const db = new TouchGrassDynamoDB(Resource.Db.name);
      event = await db.getEvent(eventId);

      if (!event) {
        results.steps.push({
          step: "fetch_event",
          status: "error",
          message: `Event ${eventId} not found in DynamoDB`,
        });
        return NextResponse.json(results, { status: 404 });
      }

      results.steps.push({
        step: "fetch_event",
        status: "success",
        message: `Found event: ${event.title}`,
      });
      results.eventId = event.pk || event.id;
    } else {
      // Create a test event
      results.steps.push({
        step: "create_test_event",
        status: "in_progress",
        message: "Creating test event...",
      });

      const testEventTitle = testTitle || `Test Event ${Date.now()}`;
      event = {
        pk: `EVENT-TEST-${Date.now()}`,
        id: `EVENT-TEST-${Date.now()}`,
        title: testEventTitle,
        description:
          "This is a test event created to verify OpenSearch indexing",
        category: ["Test"],
        location: "Washington, DC",
        venue: "Test Venue",
        cost: {
          type: "free",
          amount: 0,
          currency: "USD",
        },
        isPublic: true,
        createdAt: Date.now(),
        date: new Date().toISOString().split("T")[0],
        start_date: new Date().toISOString().split("T")[0],
      };

      results.eventId = event.pk;
      createdTestEvent = true;
      results.steps.push({
        step: "create_test_event",
        status: "success",
        message: `Created test event: ${testEventTitle}`,
      });
    }

    // OpenSearch functionality removed - events are now searched directly from DynamoDB
    results.steps.push({
      step: "opensearch_removed",
      status: "info",
      message:
        "OpenSearch has been removed. Events are now searched directly from DynamoDB with frontend filtering.",
    });

    // Verify event exists in DynamoDB
    const documentId = event.pk || event.id;
    results.steps.push({
      step: "verify_dynamodb",
      status: "success",
      message: `Event verified in DynamoDB: ${event.title} (ID: ${documentId})`,
    });

    results.success = true;
    results.searchResults = {
      message:
        "OpenSearch removed - use /api/events/all and frontend filtering instead",
      eventId: documentId,
    };

    /* OpenSearch code commented out
    // Step 2: Transform event for OpenSearch
    results.steps.push({
      step: "transform_event",
      status: "in_progress",
      message: "Transforming event for OpenSearch format...",
    });

    const searchableEvent = transformEventForOpenSearch(event);
    const documentId = event.pk || event.id;

    results.steps.push({
      step: "transform_event",
      status: "success",
      message: "Event transformed successfully",
      data: {
        documentId,
        title: searchableEvent.title,
        type: searchableEvent.type,
      },
    });

    // Step 3: Index event to OpenSearch
    results.steps.push({
      step: "index_event",
      status: "in_progress",
      message: "Indexing event to OpenSearch...",
    });

    try {
      await openSearchClient.index({
        index: INDEX_NAME,
        id: documentId,
        body: searchableEvent,
      });

      // Refresh the index to make it searchable immediately
      await openSearchClient.indices.refresh({
        index: INDEX_NAME,
      });

      results.steps.push({
        step: "index_event",
        status: "success",
        message: `Event indexed successfully with ID: ${documentId}`,
      });
    } catch (error) {
      results.steps.push({
        step: "index_event",
        status: "error",
        message: `Failed to index event: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      return NextResponse.json(results, { status: 500 });
    }

    // Step 4: Wait a moment for indexing to be fully processed
    results.steps.push({
      step: "wait_indexing",
      status: "in_progress",
      message: "Waiting for indexing to complete...",
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    results.steps.push({
      step: "wait_indexing",
      status: "success",
      message: "Index refresh completed",
    });

    // Step 5: Search for the event
    results.steps.push({
      step: "search_event",
      status: "in_progress",
      message: `Searching for event: ${event.title}...`,
    });

    try {
      // Search by title (exact match first)
      const searchResults = await searchOpenSearch(event.title, {
        type: "event",
        limit: 10,
      });

      // Check if our event is in the results
      const foundEvent = searchResults.hits.find(
        (hit: any) => hit.id === documentId || hit.title === event.title
      );

      results.searchResults = {
        total: searchResults.total,
        hits: searchResults.hits.length,
        found: !!foundEvent,
        event: foundEvent || null,
      };

      if (foundEvent) {
        results.steps.push({
          step: "search_event",
          status: "success",
          message: `Event found in search results! (Position: ${
            searchResults.hits.indexOf(foundEvent) + 1
          } of ${searchResults.hits.length})`,
        });
        results.success = true;
      } else {
        results.steps.push({
          step: "search_event",
          status: "warning",
          message: `Event not found in search results. Total results: ${searchResults.total}, Returned: ${searchResults.hits.length}`,
        });
        results.success = false;
      }
    } catch (error) {
      results.steps.push({
        step: "search_event",
        status: "error",
        message: `Search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      results.success = false;
    }

    // Step 6: Try searching by ID
    results.steps.push({
      step: "search_by_id",
      status: "in_progress",
      message: `Searching for event by ID: ${documentId}...`,
    });

    try {
      const idSearchResults = await openSearchClient.search({
        index: INDEX_NAME,
        body: {
          query: {
            term: { id: documentId },
          },
          size: 1,
        },
      });

      const foundById = idSearchResults.body.hits.hits.length > 0;

      if (foundById) {
        results.steps.push({
          step: "search_by_id",
          status: "success",
          message: `Event found by ID in OpenSearch`,
        });
      } else {
        results.steps.push({
          step: "search_by_id",
          status: "error",
          message: `Event not found by ID in OpenSearch`,
        });
      }

      results.searchById = {
        found: foundById,
        document: foundById ? idSearchResults.body.hits.hits[0]._source : null,
      };
    } catch (error) {
      results.steps.push({
        step: "search_by_id",
        status: "error",
        message: `ID search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }

    // Step 7: If we created a synthetic test event, delete it from the index
    if (createdTestEvent) {
      results.steps.push({
        step: "cleanup_test_event",
        status: "in_progress",
        message: `Deleting test event from OpenSearch (ID: ${documentId})...`,
      });

      try {
        await openSearchClient.delete({ index: INDEX_NAME, id: documentId });
        await openSearchClient.indices.refresh({ index: INDEX_NAME });

        results.steps.push({
          step: "cleanup_test_event",
          status: "success",
          message: "Test event deleted and index refreshed",
        });
      } catch (error) {
        results.steps.push({
          step: "cleanup_test_event",
          status: "warning",
          message: `Failed to delete test event: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }
    */

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error in test indexing:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        steps: [
          {
            step: "error",
            status: "error",
            message: `Test failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      },
      { status: 500 }
    );
  }
}
