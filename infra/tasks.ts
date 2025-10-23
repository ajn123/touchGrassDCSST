import { api } from "./api";
import { db } from "./db";
import { search } from "./opensearch";

const vpc = new sst.aws.Vpc("Vpc", {
  nat: "managed",
  bastion: true,
});
const cluster = new sst.aws.Cluster("Cluster", { vpc });

const WashingtonianTask = new sst.aws.Task("washingtonianTask", {
  cluster,
  link: [search, db, api],
  image: {
    context: ".", // Use project root as context
    dockerfile: "./packages/tasks/crawlers/Dockerfile",
  },
  dev: false,
  publicIp: true,
});

export { WashingtonianTask };
