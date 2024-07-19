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
  async run() {
    // Import infrastructure modules
    const { db } = await import("./infra/db");
    const { api } = await import("./infra/api");
    const { web } = await import('./infra/web');
    const { bucket } = await import("./infra/storage")
    const { email } = await import("./infra/email");

    return {
      Db: db,
      Api: api,
      Bucket: bucket,
      Web: web,
      Email: email,
    };
  },
});
