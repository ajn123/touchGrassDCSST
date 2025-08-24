import { db } from "./db";
import { bucket } from "./storage";

export const api = new sst.aws.ApiGatewayV2("Api", {
  link: [db],
  defaults: {
    function: {
      timeout: 30, // 30 seconds timeout
      memory: "1024 MB", // Increase memory for better performance
    },
  },
});


api.route("GET /events", "packages/functions/src/events/api.getEvents");

api.route("POST /events", "packages/functions/src/events/api.createEvent");

api.route("GET /events/{id}", "packages/functions/src/events/api.getEventById");

api.route("PUT /events/{id}", "packages/functions/src/events/api.updateEvent");

api.route("DELETE /events/{id}", "packages/functions/src/events/api.deleteEvent");

// Group routes
api.route("GET /groups", "packages/functions/src/groups/api.getGroups");

api.route("GET /groups/{id}", "packages/functions/src/groups/api.getGroupById");