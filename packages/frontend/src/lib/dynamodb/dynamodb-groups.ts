"use server";
import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { revalidatePath } from "next/cache";
import { Resource } from "sst";
// Remove Resource import since we'll use environment variables

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Interface for Group items
export interface Group {
  pk: string;
  sk: string;
  title: string;
  description?: string;
  category: string;
  isPublic: string;
  location?: string;
  scheduleDay?: string;
  scheduleTime?: string;
  scheduleLocation?: string;
  cost?: string;
  image_url?: string;
  schedules?: any[];
  socials?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    meetup?: string;
  };
  createdAt: number;
}

// Interface for Schedule items
export interface GroupSchedule {
  pk: string;
  sk: string;
  title: string;
  category: string;
  isPublic: string;
  scheduleDay: string;
  scheduleTime: string;
  scheduleLocation: string;
  createdAt: number;
}

// Get all groups (INFO items only)
export async function getGroups() {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "begins_with(pk, :pk) AND sk = :sk",
      ExpressionAttributeValues: {
        ":pk": { S: "GROUP#" },
        ":sk": { S: "GROUP_INFO" },
      },
    });

    const result = await client.send(command);

    if (!result.Items) return [];

    return result.Items.map((item) => unmarshall(item) as Group);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return [];
  }
}

// Get a specific group by title
export async function getGroup(title: string) {
  try {
    const command = new GetItemCommand({
      TableName: Resource.Db.name,
      Key: {
        pk: { S: `GROUP#${title}` },
        sk: { S: "GROUP_INFO" },
      },
    });

    const result = await client.send(command);

    if (!result.Item) return null;

    return unmarshall(result.Item) as Group;
  } catch (error) {
    console.error("Error fetching group:", error);
    return null;
  }
}

// Get all schedules for a specific group
export async function getGroupSchedules(groupTitle: string) {
  try {
    const command = new QueryCommand({
      TableName: Resource.Db.name,
      KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :schedulePrefix)",
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#sk": "sk",
      },
      ExpressionAttributeValues: {
        ":pk": { S: `GROUP#${groupTitle}` },
        ":schedulePrefix": { S: "SCHEDULE#" },
      },
    });

    const result = await client.send(command);

    if (!result.Items) return [];

    return result.Items.map((item) => unmarshall(item) as GroupSchedule);
  } catch (error) {
    console.error("Error fetching group schedules:", error);
    return [];
  }
}

// Transform DynamoDB schedule items to the format expected by the Schedule component
export async function transformSchedulesForDisplay(schedules: GroupSchedule[]) {
  // Group schedules by day and time to create the format expected by the Schedule component
  const scheduleMap = new Map<
    string,
    {
      days: string[];
      recurrence_type: string;
      time: string;
      location: string;
    }
  >();

  schedules.forEach((schedule) => {
    const key = `${schedule.scheduleTime}_${schedule.scheduleLocation}`;

    if (scheduleMap.has(key)) {
      // Add this day to the existing schedule
      const existing = scheduleMap.get(key)!;
      existing.days.push(schedule.scheduleDay);
    } else {
      // Create new schedule entry
      scheduleMap.set(key, {
        days: [schedule.scheduleDay],
        recurrence_type: "weekly", // Default to weekly since that's what we have in the data
        time: schedule.scheduleTime,
        location: schedule.scheduleLocation,
      });
    }
  });

  return Array.from(scheduleMap.values());
}

// Get groups by category (case-insensitive)
export async function getGroupsByCategory(category: string) {
  try {
    // Fetch all groups and filter case-insensitively in application code
    // since DynamoDB FilterExpressions don't support case-insensitive comparisons
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "#sk = :groupInfo",
      ExpressionAttributeNames: {
        "#sk": "sk",
      },
      ExpressionAttributeValues: {
        ":groupInfo": { S: "GROUP_INFO" },
      },
    });

    const result = await client.send(command);

    if (!result.Items) return [];

    const allGroups = result.Items.map((item) => unmarshall(item) as Group);

    // Filter case-insensitively
    const normalizedSearchCategory = category.toLowerCase().trim();
    return allGroups.filter((group) => {
      if (!group.category) return false;

      const groupCategories = group.category
        .split(",")
        .map((cat: string) => cat.toLowerCase().trim());

      return groupCategories.includes(normalizedSearchCategory);
    });
  } catch (error) {
    console.error("Error fetching groups by category:", error);
    return [];
  }
}

// Get public groups only (using GSI for efficiency instead of scanning entire table)
export async function getPublicGroups() {
  try {
    const allGroups: Group[] = [];
    let lastEvaluatedKey: any = undefined;

    // console.log("🔍 getPublicGroups called");
    // console.log("🔍 Resource.Db.name:", Resource.Db.name);
    // console.log("🔍 publicEventsIndex:", "publicEventsIndex");
    // console.log("🔍 groupPrefix:", "GROUP#");
    // console.log("🔍 groupInfo:", "GROUP_INFO");
    // console.log("🔍 isPublic:", "true");

    // Use Query with the publicEventsIndex GSI instead of Scan
    // This is much more efficient - only reads items where isPublic = "true"
    // instead of scanning the entire table
    do {
      const command = new QueryCommand({
        TableName: Resource.Db.name,
        IndexName: "publicEventsIndex", // Use the GSI with isPublic as hash key
        KeyConditionExpression: "#isPublic = :isPublic",
        FilterExpression: "begins_with(pk, :groupPrefix) AND #sk = :groupInfo",
        ExpressionAttributeNames: {
          "#isPublic": "isPublic",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":isPublic": { S: "true" },
          ":groupPrefix": { S: "GROUP#" },
          ":groupInfo": { S: "GROUP_INFO" },
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await client.send(command);

      if (result.Items) {
        const groups = result.Items.map((item) => unmarshall(item) as Group);
        allGroups.push(...groups);
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(
      `✅ Fetched ${allGroups.length} public groups (using GSI Query)`
    );
    return allGroups;
  } catch (error) {
    console.error("Error fetching public groups:", error);
    // Fallback to scan if GSI query fails (e.g., if index doesn't exist)
    console.log("⚠️ Falling back to Scan operation...");
    return getPublicGroupsFallback();
  }
}

// Fallback function using Scan (less efficient but works if GSI is unavailable)
async function getPublicGroupsFallback() {
  try {
    const allGroups: Group[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const command = new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression:
          "begins_with(pk, :groupPrefix) AND #sk = :groupInfo AND #isPublic = :isPublic",
        ExpressionAttributeNames: {
          "#sk": "sk",
          "#isPublic": "isPublic",
        },
        ExpressionAttributeValues: {
          ":groupPrefix": { S: "GROUP#" },
          ":groupInfo": { S: "GROUP_INFO" },
          ":isPublic": { S: "true" },
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await client.send(command);

      if (result.Items) {
        const groups = result.Items.map((item) => unmarshall(item) as Group);
        allGroups.push(...groups);
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(
      `✅ Fetched ${allGroups.length} public groups (using Scan fallback)`
    );
    return allGroups;
  } catch (error) {
    console.error("Error fetching public groups (fallback):", error);
    return [];
  }
}

// Search groups with filters
export async function searchGroups(filters: {
  query?: string;
  categories?: string[];
  isPublic?: boolean;
  scheduleDay?: string;
  scheduleTime?: string;
  location?: string;
  limit?: number;
}) {
  try {
    let filterExpressions: string[] = ["#sk = :groupInfo"];
    let expressionAttributeNames: { [key: string]: string } = {
      "#sk": "sk",
    };
    let expressionAttributeValues: { [key: string]: any } = {
      ":groupInfo": { S: "GROUP_INFO" },
    };

    // Add enhanced text search filter
    if (filters.query && filters.query.trim()) {
      const query = filters.query.trim();

      // Search across multiple fields for comprehensive results
      const textSearchExpressions = [
        "contains(#title, :query)",
        "contains(#category, :query)",
        "contains(#description, :query)",
      ];

      filterExpressions.push(`(${textSearchExpressions.join(" OR ")})`);

      // Add attribute names for all searchable fields
      expressionAttributeNames["#title"] = "title";
      expressionAttributeNames["#category"] = "category";
      expressionAttributeNames["#description"] = "description";

      expressionAttributeValues[":query"] = { S: query };
    }

    // Note: Category filter will be applied case-insensitively in application code
    // Store normalized categories for later filtering
    const normalizedCategories = filters.categories
      ? filters.categories.map((cat: string) => cat.toLowerCase().trim())
      : [];

    // Add public/private filter
    if (filters.isPublic !== undefined) {
      filterExpressions.push("#isPublic = :isPublic");
      expressionAttributeNames["#isPublic"] = "isPublic";
      expressionAttributeValues[":isPublic"] = {
        S: filters.isPublic.toString(),
      };
    }

    // Add schedule day filter
    if (filters.scheduleDay) {
      filterExpressions.push("#scheduleDay = :scheduleDay");
      expressionAttributeNames["#scheduleDay"] = "scheduleDay";
      expressionAttributeValues[":scheduleDay"] = { S: filters.scheduleDay };
    }

    // Add schedule time filter
    if (filters.scheduleTime) {
      filterExpressions.push("#scheduleTime = :scheduleTime");
      expressionAttributeNames["#scheduleTime"] = "scheduleTime";
      expressionAttributeValues[":scheduleTime"] = { S: filters.scheduleTime };
    }

    // Add location filter
    if (filters.location) {
      filterExpressions.push("contains(#scheduleLocation, :location)");
      expressionAttributeNames["#scheduleLocation"] = "scheduleLocation";
      expressionAttributeValues[":location"] = { S: filters.location };
    }

    const filterExpression = filterExpressions.join(" AND ");

    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: filters.limit,
    });

    const result = await client.send(command);

    if (!result.Items) return [];

    let groups = result.Items.map((item) => unmarshall(item) as Group);

    // Apply case-insensitive category filter if specified
    if (normalizedCategories.length > 0) {
      groups = groups.filter((group) => {
        if (!group.category) return false;

        const groupCategories = group.category
          .split(",")
          .map((cat: string) => cat.toLowerCase().trim());

        // Check if any of the normalized search categories match any of the group's categories
        return normalizedCategories.some((searchCat) =>
          groupCategories.includes(searchCat)
        );
      });
    }

    // Apply limit if specified
    if (filters.limit) {
      groups = groups.slice(0, filters.limit);
    }

    return groups;
  } catch (error) {
    console.error("Error searching groups:", error);
    return [];
  }
}

// Simple search function that's more likely to return results
export async function searchGroupsSimple(filters: {
  query?: string;
  categories?: string[];
  isPublic?: boolean;
  limit?: number;
}) {
  try {
    console.log("🔍 searchGroupsSimple called with filters:", filters);

    // If no query, just get all groups
    if (!filters.query || !filters.query.trim()) {
      console.log("🔍 No query provided, getting all groups...");
      return await getGroups();
    }

    const query = filters.query.trim().toLowerCase();
    console.log("🔍 Searching for query:", query);

    // Get all groups first, then filter client-side for better results
    const allGroups = await getGroups();
    console.log("🔍 Total groups available:", allGroups.length);

    // Filter groups that match the query (case-insensitive)
    const matchingGroups = allGroups.filter((group) => {
      const title = (group.title || "").toLowerCase();
      const description = (group.description || "").toLowerCase();
      const category = (group.category || "").toLowerCase();

      const matchesQuery =
        title.includes(query) ||
        description.includes(query) ||
        category.includes(query);

      // Also apply case-insensitive category filter if specified
      if (filters.categories && filters.categories.length > 0) {
        const normalizedSearchCategories = filters.categories.map(
          (cat: string) => cat.toLowerCase().trim()
        );
        const groupCategories = category
          .split(",")
          .map((cat: string) => cat.trim());

        const matchesCategory = normalizedSearchCategories.some((searchCat) =>
          groupCategories.includes(searchCat)
        );

        return matchesQuery && matchesCategory;
      }

      return matchesQuery;
    });

    console.log("🔍 Matching groups found:", matchingGroups.length);

    // Apply limit if specified
    if (filters.limit) {
      return matchingGroups.slice(0, filters.limit);
    }

    return matchingGroups;
  } catch (error) {
    console.error("❌ Error in searchGroupsSimple:", error);
    return [];
  }
}

// Get groups by schedule day
export async function getGroupsByScheduleDay(day: string) {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "#scheduleDay = :day",
      ExpressionAttributeNames: {
        "#scheduleDay": "scheduleDay",
      },
      ExpressionAttributeValues: {
        ":day": { S: day },
      },
    });

    const result = await client.send(command);

    if (!result.Items) return [];

    return result.Items.map((item) => unmarshall(item) as Group);
  } catch (error) {
    console.error("Error fetching groups by schedule day:", error);
    return [];
  }
}

// Get groups by schedule time
export async function getGroupsByScheduleTime(time: string) {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "#scheduleTime = :time",
      ExpressionAttributeNames: {
        "#scheduleTime": "scheduleTime",
      },
      ExpressionAttributeValues: {
        ":time": { S: time },
      },
    });

    const result = await client.send(command);

    if (!result.Items) return [];

    return result.Items.map((item) => unmarshall(item) as Group);
  } catch (error) {
    console.error("Error fetching groups by schedule time:", error);
    return [];
  }
}

// Get groups by location
export async function getGroupsByLocation(location: string) {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "contains(#scheduleLocation, :location)",
      ExpressionAttributeNames: {
        "#scheduleLocation": "scheduleLocation",
      },
      ExpressionAttributeValues: {
        ":location": { S: location },
      },
    });

    const result = await client.send(command);

    if (!result.Items) return [];

    return result.Items.map((item) => unmarshall(item) as Group);
  } catch (error) {
    console.error("Error fetching groups by location:", error);
    return [];
  }
}

// Create a new group
export async function createGroup(groupData: {
  title: string;
  description?: string;
  category: string[];
  isPublic: boolean;
  schedules?: Array<{
    days: string[];
    recurrence_type: string;
    time: string;
    location: string;
  }>;
}) {
  try {
    const timestamp = Date.now();
    const items: any[] = [];

    // Create the main group INFO item
    const groupInfoItem = {
      pk: `GROUP#${groupData.title}`,
      sk: "GROUP_INFO",
      title: groupData.title,
      description: groupData.description || "",
      category: groupData.category,
      isPublic: groupData.isPublic.toString(),
      createdAt: timestamp,
    };
    items.push(groupInfoItem);

    // Create schedule items if provided
    if (groupData.schedules && groupData.schedules.length > 0) {
      for (const schedule of groupData.schedules) {
        for (const day of schedule.days) {
          const sortKey = `${day}_${schedule.time.replace(
            /[:\s]/g,
            ""
          )}_${schedule.location.replace(/[^a-zA-Z0-9]/g, "")}`;

          const scheduleItem = {
            pk: `GROUP#${groupData.title}`,
            sk: `SCHEDULE#${sortKey}`,
            title: groupData.title,
            category: groupData.category,
            isPublic: groupData.isPublic.toString(),
            scheduleDay: day,
            scheduleTime: schedule.time,
            scheduleLocation: schedule.location,
            createdAt: timestamp,
          };
          items.push(scheduleItem);
        }
      }
    }

    // Insert items one by one
    for (const item of items) {
      const command = new PutItemCommand({
        TableName: Resource.Db.name,
        Item: item,
      });
      await client.send(command);
    }

    revalidatePath("/");
    return `Group "${groupData.title}" created successfully with ${
      items.length - 1
    } schedules`;
  } catch (error) {
    console.error("Error creating group:", error);
    return "Error creating group";
  }
}

// Update a group
export async function updateGroup(title: string, updates: Partial<Group>) {
  try {
    const existingGroup = await getGroup(title);
    if (!existingGroup) {
      return "Group not found";
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    // Build update expression dynamically
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "pk" && key !== "sk" && key !== "createdAt") {
        const nameKey = `#${key}`;
        const valueKey = `:${key}`;

        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;

        if (Array.isArray(value)) {
          expressionAttributeValues[valueKey] = {
            L: value.map((v) => ({ S: v })),
          };
        } else if (typeof value === "number") {
          expressionAttributeValues[valueKey] = { N: value.toString() };
        } else {
          expressionAttributeValues[valueKey] = { S: value };
        }
      }
    });

    if (updateExpressions.length === 0) {
      return "No valid updates provided";
    }

    // Add updatedAt timestamp
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = { N: Date.now().toString() };

    const command = new UpdateItemCommand({
      TableName: Resource.Db.name,
      Key: {
        pk: { S: `GROUP#${title}` },
        sk: { S: "GROUP_INFO" },
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await client.send(command);
    revalidatePath("/");
    return `Group "${title}" updated successfully`;
  } catch (error) {
    console.error("Error updating group:", error);
    return "Error updating group";
  }
}

// Delete a group and all its schedules
export async function deleteGroup(title: string) {
  try {
    // First, get all schedules for this group
    const schedules = await getGroupSchedules(title);

    // Delete all schedule items
    for (const schedule of schedules) {
      const command = new DeleteItemCommand({
        TableName: Resource.Db.name,
        Key: {
          pk: { S: schedule.pk },
          sk: { S: schedule.sk },
        },
      });
      await client.send(command);
    }

    // Delete the main group INFO item
    const command = new DeleteItemCommand({
      TableName: Resource.Db.name,
      Key: {
        pk: { S: `GROUP#${title}` },
        sk: { S: "GROUP_INFO" },
      },
    });

    await client.send(command);
    revalidatePath("/");
    return `Group "${title}" and ${schedules.length} schedules deleted successfully`;
  } catch (error) {
    console.error("Error deleting group:", error);
    return "Error deleting group";
  }
}

// Get all unique categories from groups
export async function getGroupCategories() {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "#sk = :groupInfo",
      ExpressionAttributeNames: {
        "#sk": "sk",
      },
      ExpressionAttributeValues: {
        ":groupInfo": { S: "GROUP_INFO" },
      },
    });

    const result = await client.send(command);
    const uniqueCategories = new Set<string>();

    result.Items?.forEach((item) => {
      const unmarshalledItem = unmarshall(item);
      if (
        typeof unmarshalledItem.category === "string" &&
        unmarshalledItem.category.trim()
      ) {
        // Split comma-separated categories and add each one (normalized to lowercase)
        const categories = unmarshalledItem.category
          .split(",")
          .map((cat) => cat.trim().toLowerCase())
          .filter((cat) => cat);
        categories.forEach((category) => {
          uniqueCategories.add(category);
        });
      }
    });

    return Array.from(uniqueCategories).map((category) => ({ category }));
  } catch (error) {
    console.error("Error fetching group categories:", error);
    return [];
  }
}

// Get groups with upcoming schedules (within next 7 days)
export async function getGroupsWithUpcomingSchedules() {
  try {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const upcomingDays: string[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      upcomingDays.push(daysOfWeek[date.getDay()]);
    }

    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "#sk = :schedulePrefix AND #isPublic = :isPublic",
      ExpressionAttributeNames: {
        "#sk": "sk",
        "#isPublic": "isPublic",
      },
      ExpressionAttributeValues: {
        ":schedulePrefix": { S: "SCHEDULE#" },
        ":isPublic": { S: "true" },
      },
    });

    const result = await client.send(command);

    if (!result.Items) return [];

    const schedules = result.Items.map((item) => unmarshall(item) as Group);

    // Filter for upcoming schedules
    return schedules.filter((schedule) =>
      upcomingDays.includes(schedule.scheduleDay || "")
    );
  } catch (error) {
    console.error("Error fetching upcoming schedules:", error);
    return [];
  }
}
