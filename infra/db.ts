export const db = new sst.aws.Dynamo("Db", {
  fields: {
    // Primary key fields
    pk: "string", // Partition Key (e.g., "USER#123", "EVENT#456", "ORDER#789")
    sk: "string", // Sort Key (e.g., "PROFILE", "EVENT#456", "ORDER#789#ITEM#123")

    // Common fields
    createdAt: "number",

    // Event fields (only the ones we actually index)
    title: "string", // Event title
    category: "string", // Event category (comma-separated string for GSI compatibility)
    isPublic: "string", // Whether the event is publicly visible

    scheduleDay: "string", // Day of the week for group schedules
    scheduleTime: "string", // Time for group schedules
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
    // GSI for events by category (category -> createdAt)
    eventCategoryIndex: {
      hashKey: "category",
      rangeKey: "createdAt",
    },
    // GSI for public events (isPublic -> createdAt)
    publicEventsIndex: {
      hashKey: "isPublic",
      rangeKey: "createdAt",
    },
    // GSI for events by title (title -> createdAt)
    eventTitleIndex: {
      hashKey: "title",
      rangeKey: "createdAt",
    },
    // GSI for groups by schedule details
    groupScheduleIndex: {
      hashKey: "scheduleDay",
      rangeKey: "scheduleTime",
    },
  },
});
