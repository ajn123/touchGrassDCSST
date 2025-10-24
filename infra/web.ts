import { api } from "./api";
import { auth } from "./auth";
import { db } from "./db";
import { email } from "./email";
import { search } from "./opensearch";
import { queue } from "./queue";
import { GOOGLE_MAPS_API_KEY } from "./secrets";
import { bucket } from "./storage";
import { WashingtonianTask } from "./tasks";

export const web = new sst.aws.Nextjs("Web", {
  path: "packages/frontend",
  link: [
    db,
    api,
    bucket,
    email,
    GOOGLE_MAPS_API_KEY,
    auth,
    queue,
    search,
    WashingtonianTask,
  ],

  domain: {
    name: "touchgrassdc.com",
    redirects: ["www.touchgrassdc.com"],
  },

  environment: {
    DB_NAME: db.name,
    API_URL: api.url,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY.value,
    NEXT_PUBLIC_WEBSITE_URL: "https://touchgrassdc.com",
    NEXT_PUBLIC_DB_NAME: db.name,
  },
});
