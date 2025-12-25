import { api } from "./api";
import { db } from "./db";
import { search } from "./opensearch";

// Define functions separately to ensure environment variables are applied
const normalizeEventFunction = new sst.aws.Function("normalizeEventFunction", {
  handler: "packages/functions/src/events/normalizeEvents.handler",
  link: [api, db],
});

const addEventToDBFunction = new sst.aws.Function("addEventToDBFunction", {
  handler: "packages/functions/src/events/addEventToDb.handler",
  link: [db],
  // Set environment variable using template string to avoid syntax errors
  // The function will use this as fallback if Resource.Db.name is not available
  environment: {
    // Use template literal to ensure it's treated as a string value, not code
    DB_NAME: `${db.name}`,
  },
});

const normalize = sst.aws.StepFunctions.lambdaInvoke({
  name: "Normalize",
  payload: {
    body: "{% $states.input %}",
  },
  function: normalizeEventFunction,
});

const dbInsert = sst.aws.StepFunctions.lambdaInvoke({
  name: "Add Event to DB",
  payload: {
    body: "{% $states.input %}",
  },
  function: addEventToDBFunction,
});

const reindexEvents = sst.aws.StepFunctions.lambdaInvoke({
  name: "Reindex Events",
  payload: {
    body: "{% $states.input %}",
  },
  function: new sst.aws.Function("reindexEventsFunction", {
    handler: "packages/functions/src/events/reindexEvents.handler",
    link: [search],
  }),
});

const eventInsertionSuccess = sst.aws.StepFunctions.succeed({ name: "Done" });

const normalizeEventStepFunction = new sst.aws.StepFunctions(
  "normaizeEventStepFunction",

  {
    logging: {
      retention: "1 month",
      level: "all",
      includeData: true,
    },
    type: "standard",
    definition: normalize
      .next(dbInsert)
      .next(reindexEvents)
      .next(eventInsertionSuccess),
  }
);

export {
  addEventToDBFunction,
  normalizeEventFunction,
  normalizeEventStepFunction,
};
