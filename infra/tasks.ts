import { api } from "./api";
import { db } from "./db";
import { search } from "./opensearch";
import { normalizeEventStepFunction } from "./step_functions";

const vpc = new sst.aws.Vpc("Vpc");
const cluster = new sst.aws.Cluster("Cluster", { vpc });

const WashingtonianTask = new sst.aws.Task("washingtonianTask", {
  cluster,
  link: [search, db, api, normalizeEventStepFunction],
  image: {
    context: ".", // Use project root as context
    dockerfile: "./packages/tasks/crawlers/Dockerfile",
  },
  dev: false,
});

export { WashingtonianTask };
