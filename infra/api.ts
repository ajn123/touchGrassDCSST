import { db } from "./db";
import { OPENWEBNINJA_API_KEY } from "./secrets";
export const api = new sst.aws.ApiGatewayV2("Api", {
  link: [db, OPENWEBNINJA_API_KEY],
});

api.route("GET /events", "packages/functions/src/events/api.getEvents");

api.route("POST /events", "packages/functions/src/events/api.createEvent");

api.route("GET /events/{id}", "packages/functions/src/events/api.getEventById");

api.route("PUT /events/{id}", "packages/functions/src/events/api.updateEvent");

api.route(
  "DELETE /events/{id}",
  "packages/functions/src/events/api.deleteEvent"
);

api.route("POST /crawler/openwebninja", {
  link: [api],
  handler: "packages/functions/src/events/openWeb.handler",
});

// api.route("POST /events/normalize", {
//   link: [api],
//   handler: "packages/functions/src/events/normalizeEvents.handler",
// });
