import { api } from "./api";
import { db } from "./db";
import { search } from "./opensearch";
import { OPENWEBNINJA_API_KEY } from "./secrets";
import { normalizeEventStepFunction } from "./step_functions";
import { WashingtonianTask } from "./tasks";

const cron = new sst.aws.Cron("cron", {
  function: {
    handler: "packages/functions/src/events/openWeb.handler",
    link: [search, db, OPENWEBNINJA_API_KEY, api, normalizeEventStepFunction],
  },
  schedule: "rate(1 day)",
});

const washingtonianCron = new sst.aws.Cron("washingtonianCron", {
  task: WashingtonianTask,
  schedule: "rate(7 days)",
});

export { cron, washingtonianCron };
