/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "touchgrassdcsst",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },

  async run() {
    // Import infrastructure modules
    const { db } = await import("./infra/db");
    const { api } = await import("./infra/api");
    const { web } = await import("./infra/web");
    const { bucket } = await import("./infra/storage");
    const { email } = await import("./infra/email");
    const { auth } = await import("./infra/auth");
    const { queue } = await import("./infra/queue");
    const { cron, washingtonianCron, copyProdToDevCron } = await import("./infra/cron");
    const { WashingtonianTask, ClockOutDCTask, EventbriteTask } = await import(
      "./infra/tasks"
    );
    const { normalizeEventStepFunction } = await import(
      "./infra/step_functions"
    );
    return {
      Db: db,
      Cron: cron,
      washingtonianCron: washingtonianCron,
      ...(copyProdToDevCron && { copyProdToDevCron }),
      Api: api,
      Bucket: bucket,
      Web: web,
      Email: email,
      Auth: auth,
      Queue: queue,
      WashingtonianTask: WashingtonianTask,
      ClockOutDCTask: ClockOutDCTask,
      EventbriteTask: EventbriteTask,
      NormalizeEventStepFunction: normalizeEventStepFunction,
    };
  },
});
