import { db } from "./db";
import { bucket } from "./storage";


export const api = new sst.aws.ApiGatewayV2("Api", {
  link: [db],
});



api.route("GET /events", "packages/functions/src/events/api.getEvents");

api.route("POST /events", "packages/functions/src/events/api.createEvent");

api.route("GET /events/{id}", "packages/functions/src/events/api.getEventById");

api.route("PUT /events/{id}", "packages/functions/src/events/api.updateEvent");

api.route("DELETE /events/{id}", "packages/functions/src/events/api.deleteEvent");