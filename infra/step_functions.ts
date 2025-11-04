import { api } from "./api";
import { db } from "./db";
import { search } from "./opensearch";

const normalize = sst.aws.StepFunctions.lambdaInvoke({
  name: "Normalize",
  payload: {
    body: "{% $states.input %}",
  },
  function: new sst.aws.Function("normalizeEventFunction", {
    handler: "packages/functions/src/events/normalizeEvents.handler",
    link: [api],
  }),
});

const dbInsert = sst.aws.StepFunctions.lambdaInvoke({
  name: "Add Event to DB",
  payload: {
    body: "{% $states.input %}",
  },
  function: new sst.aws.Function("addEventToDBFunction", {
    handler: "packages/functions/src/events/addEventToDB.handler",
    link: [db],
  }),
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

export { normalizeEventStepFunction };
