import { db } from "./db";
import { search } from "./opensearch";

const OPENWEBNINJA_API_KEY = new sst.Secret("OPENWEBNINJA_API_KEY");

export const api = new sst.aws.ApiGatewayV2("Api", {
  link: [db, search, OPENWEBNINJA_API_KEY],
});

api.route("GET /events", "packages/functions/src/events/api.getEvents");

api.route("POST /events", "packages/functions/src/events/api.createEvent");

api.route("GET /events/{id}", "packages/functions/src/events/api.getEventById");

api.route("PUT /events/{id}", "packages/functions/src/events/api.updateEvent");

api.route(
  "DELETE /events/{id}",
  "packages/functions/src/events/api.deleteEvent"
);

api.route("GET /events/sync", {
  handler: "packages/functions/src/events/openWeb.handler",
});
