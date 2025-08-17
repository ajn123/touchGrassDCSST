import { db } from "./db";
import { api } from "./api";
import { bucket } from "./storage";
import { email } from "./email";
import { auth } from "./auth";

const googleMapsApiKey = new sst.Secret("GOOGLE_MAPS_API_KEY");

export const web = new sst.aws.Nextjs("Web", {
  path: "packages/frontend",
  link: [db, api, bucket, email, googleMapsApiKey, auth],

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