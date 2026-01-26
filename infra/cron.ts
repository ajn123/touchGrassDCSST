import { api } from "./api";
import { db } from "./db";
import { OPENWEBNINJA_API_KEY } from "./secrets";
import { normalizeEventStepFunction } from "./step_functions";
import { ClockOutDCTask, DCComedyLoftTask, DCImprovTask, EventbriteTask, WashingtonianTask } from "./tasks";

const cron = new sst.aws.Cron("cron", {
  function: {
    handler: "packages/functions/src/events/openWeb.handler",
    link: [db, OPENWEBNINJA_API_KEY, api, normalizeEventStepFunction],
  },
  schedule: "rate(1 day)",
});

const washingtonianCron = new sst.aws.Cron("washingtonianCron", {
  task: WashingtonianTask,
  schedule: "rate(1 day)",
});

const clockoutdcCron = new sst.aws.Cron("clockoutdcCron", {
  task: ClockOutDCTask,
  schedule: "rate(1 day)",
});

const eventbriteCron = new sst.aws.Cron("eventbriteCron", {
  task: EventbriteTask,
  schedule: "rate(1 day)",
});

const dcimprovCron = new sst.aws.Cron("dcimprovCron", {
  task: DCImprovTask,
  schedule: "rate(7 days)",
});

const dccomedyloftCron = new sst.aws.Cron("dccomedyloftCron", {
  task: DCComedyLoftTask,
  schedule: "rate(7 days)",
});

// Daily copy of production DB to dev (only runs in non-production stages)
// Note: This cron will only be created in non-production stages
// The function itself checks the stage and prevents running in production
const copyProdToDevCron = new sst.aws.Cron("copyProdToDevCron", {
  function: {
    handler: "packages/functions/src/events/copyProdToDev.handler",
    link: [db],
    environment: {
      // Production table name - update this with the actual production table name
      // You can get it by running: npm run print:table:prod
      PRODUCTION_TABLE_NAME: `touchgrassdcsst-production-DbTable-bcabbfkm`,
    },
  },
  schedule: "cron(0 2 * * ? *)", // Daily at 2 AM UTC (10 PM EST previous day)
});

export {
  clockoutdcCron,
  copyProdToDevCron,
  cron, dccomedyloftCron, dcimprovCron, eventbriteCron,
  washingtonianCron
};

