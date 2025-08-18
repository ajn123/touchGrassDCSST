export const db = new sst.aws.Dynamo("Db", {
  fields: {
    // Primary key fields
    pk: "string", // Partition Key (e.g., "USER#123", "EVENT#456", "ORDER#789")
    sk: "string", // Sort Key (e.g., "PROFILE", "EVENT#456", "ORDER#789#ITEM#123")

    // Common fields
    createdAt: "number",

    // Event fields (only the ones we actually index)
    title: "string", // Event title
    category: "string", // Event category
    eventDate: "string",
    organizerId: "string",
    is_public: "boolean", // Whether the event is publicly visible

    // Order fields
    customerId: "string",

    // Product fields
    productName: "string",
  },
  primaryIndex: {
    hashKey: "pk",
    rangeKey: "sk",
  },
  globalIndexes: {
    // GSI for sorting by creation time across all entities
    createdAtIndex: {
      hashKey: "createdAt",
      rangeKey: "pk",
    },
    // GSI for user events (organizerId -> eventDate)
    userEventsIndex: {
      hashKey: "organizerId",
      rangeKey: "eventDate",
    },
    // GSI for orders by customer
    customerOrdersIndex: {
      hashKey: "customerId",
      rangeKey: "createdAt",
    },
    // GSI for products by category
    productCategoryIndex: {
      hashKey: "category",
      rangeKey: "productName",
    },
    // GSI for events by category (category -> createdAt)
    eventCategoryIndex: {
      hashKey: "category",
      rangeKey: "createdAt",
    },
    // GSI for public events (is_public -> createdAt)
    publicEventsIndex: {
      hashKey: "is_public",
      rangeKey: "createdAt",
    },
    // GSI for events by title (title -> createdAt)
    eventTitleIndex: {
      hashKey: "title",
      rangeKey: "createdAt",
    },
  },
});
