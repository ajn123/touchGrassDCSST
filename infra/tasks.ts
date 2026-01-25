import { api } from "./api";
import { db } from "./db";
import { normalizeEventStepFunction } from "./step_functions";

const vpc = new sst.aws.Vpc("Vpc");
const cluster = new sst.aws.Cluster("Cluster", { vpc });

const memory = "2 GB";
const cpu = "1 vCPU";

const WashingtonianTask = new sst.aws.Task("washingtonianTask", {
  cluster,
  link: [db, api, normalizeEventStepFunction],
  image: {
    context: ".", // Use project root as context
    dockerfile: "./packages/tasks/crawlers/Dockerfile",
  },
  memory: memory, // 2 GB
  cpu: cpu, // 1 vCPU
  environment: {
    NODE_OPTIONS: "--max-old-space-size=1536", // Allow Node.js to use up to 1.5 GB (leaving ~500 MB for system/Playwright)
  },
  dev: false,
});

const ClockOutDCTask = new sst.aws.Task("clockoutdcTask", {
  cluster,
  link: [db, api, normalizeEventStepFunction],
  image: {
    context: ".", // Use project root as context
    dockerfile: "./packages/tasks/crawlers/Dockerfile.clockoutdc",
  },
  memory: memory, // 2 GB
  cpu: cpu, // 1 vCPU
  environment: {
    NODE_OPTIONS: "--max-old-space-size=1536", // Allow Node.js to use up to 1.5 GB (leaving ~500 MB for system/Playwright)
  },
  dev: false,
});

const EventbriteTask = new sst.aws.Task("eventbriteTask", {
  cluster,
  link: [db, api, normalizeEventStepFunction],
  image: {
    context: ".", // Use project root as context
    dockerfile: "./packages/tasks/crawlers/Dockerfile.eventbrite",
  },
  memory: memory, // 2 GB
  cpu: cpu, // 1 vCPU
  environment: {
    NODE_OPTIONS: "--max-old-space-size=1536", // Allow Node.js to use up to 1.5 GB (leaving ~500 MB for system/Playwright)
  },
  dev: false,
});

const DCImprovTask = new sst.aws.Task("dcimprovTask", {
  cluster,
  link: [db, api, normalizeEventStepFunction],
  image: {
    context: ".", // Use project root as context
    dockerfile: "./packages/tasks/crawlers/Dockerfile.dcimprov",
  },
});

const DCComedyLoftTask = new sst.aws.Task("dccomedyloftTask", {
  cluster,
  link: [db, api, normalizeEventStepFunction],
  image: {
    context: ".", // Use project root as context
    dockerfile: "./packages/tasks/crawlers/Dockerfile.dccomedyloft",
  },
});

export { ClockOutDCTask, DCComedyLoftTask, DCImprovTask, EventbriteTask, WashingtonianTask };

