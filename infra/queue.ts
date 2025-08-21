import { db } from "./db";

const queue = new sst.aws.Queue("user_analytics", {
  visibilityTimeout: "1 hour",
});

queue.subscribe({
  handler: "packages/user_analytics/userAction.handler",
  link: [db],
});

export { queue };
