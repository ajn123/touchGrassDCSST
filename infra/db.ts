export const db = new sst.aws.Dynamo("Db", {
  fields: {
    // Primary key fields
    pk: "string", // Partition Key (e.g., "USER#123", "EVENT#456", "ORDER#789")
    sk: "string", // Sort Key (e.g., "PROFILE", "EVENT#456", "ORDER#789#ITEM#123")
    
    // Common fields
    createdAt: "number",
    
    
    eventDate: "string",
    organizerId: "string",
    
    // Order fields
    customerId: "string",
    
    // Product fields
    productName: "string",
    category: "string",
    
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
  },
});