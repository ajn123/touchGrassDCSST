/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "monorepo-template",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  console: {
    autodeploy: {
      async workflow({ $, event }) {
        // Perform deployment workflow actions here
        await $`cd packages/scripts`;
        await $`npm install`;
        await $`node packages/scripts/src/seed-events.ts`;
        await $`node packages/scripts/src/seed-groups.ts`;
        await $`npm run migrate:opensearch`;
      },
    },
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
    const { search } = await import("./infra/opensearch");
    const { cron } = await import("./infra/cron");

    return {
      Db: db,
      Cron: cron,
      Api: api,
      Bucket: bucket,
      Web: web,
      Email: email,
      Auth: auth,
      Queue: queue,
      Search: search,
    };
  },
});
