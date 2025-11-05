import { api } from "./api";
import { db } from "./db";
import { search } from "./opensearch";
import { OPENWEBNINJA_API_KEY } from "./secrets";
import { normalizeEventStepFunction } from "./step_functions";
import { ClockOutDCTask, EventbriteTask, WashingtonianTask } from "./tasks";

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

const clockoutdcCron = new sst.aws.Cron("clockoutdcCron", {
  task: ClockOutDCTask,
  schedule: "rate(10 days)",
});

const eventbriteCron = new sst.aws.Cron("eventbriteCron", {
  task: EventbriteTask,
  schedule: "rate(7 days)",
});

export { clockoutdcCron, cron, eventbriteCron, washingtonianCron };
