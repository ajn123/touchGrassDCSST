import { api } from "./api";
import { db } from "./db";
import { search } from "./opensearch";

const normalizeEventFunction = new sst.aws.Function("normalizeEventFunction", {
  handler: "packages/functions/src/events/normalizeEvents.handler",
  link: [api],
});
const normalize = sst.aws.StepFunctions.lambdaInvoke({
  name: "Normalize",
  function: normalizeEventFunction,
});

const addEventToDBFunction = new sst.aws.Function("addEventToDBFunction", {
  handler: "packages/functions/src/events/addEventToDB.handler",
  link: [db],
});

const dbInsert = sst.aws.StepFunctions.lambdaInvoke({
  name: "Add Event to DB",
  function: addEventToDBFunction,
});

const reindexEventsFunction = new sst.aws.Function("reindexEventsFunction", {
  handler: "packages/functions/src/events/reindexEvents.handler",
  link: [search],
});

const reindexEvents = sst.aws.StepFunctions.lambdaInvoke({
  name: "Reindex Events",
  function: reindexEventsFunction,
});

const passThrough = sst.aws.StepFunctions.pass({ name: "Pass Through" });

const eventInsertionSuccess = sst.aws.StepFunctions.succeed({ name: "Dane" });

const normalizeEventStepFunction = new sst.aws.StepFunctions(
  "normaizeEventStepFunction",

  {
    logging: {
      retention: "1 month",
      level: "all",
      includeData: true,
    },
    type: "express",
    definition: normalize
      .next(dbInsert)
      .next(reindexEvents)
      .next(eventInsertionSuccess),
  }
);

export { normalizeEventStepFunction };
