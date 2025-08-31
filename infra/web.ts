import { api } from "./api";
import { auth } from "./auth";
import { db } from "./db";
import { email } from "./email";
import { search } from "./opensearch";
import { queue } from "./queue";
import { bucket } from "./storage";

const googleMapsApiKey = new sst.Secret("GOOGLE_MAPS_API_KEY");

export const web = new sst.aws.Nextjs("Web", {
  path: "packages/frontend",
  link: [db, api, bucket, email, googleMapsApiKey, auth, queue, search],

  domain: {
    name: "touchgrassdc.com",
    redirects: ["www.touchgrassdc.com"],
  },

  environment: {
    DB_NAME: db.name,
    API_URL: api.url,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsApiKey.value,
    NEXT_PUBLIC_WEBSITE_URL: "https://touchgrassdc.com",
  },
});
