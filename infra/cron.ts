import { api } from "./api";
import { db } from "./db";
import { EmailConfig } from "./email";
import { GOOGLE_MAPS_API_KEY, OPENROUTER_API_KEY, OPENWEBNINJA_API_KEY, TICKETMASTER_API_KEY } from "./secrets";
import { normalizeEventStepFunction } from "./step_functions";
import { bucket } from "./storage";
import {
  DCBarEventsTask,
  DCComedyLoftTask,
  DCImprovTask,
  EventbriteTask,
  IndieVenuesTask,
  KennedyCenterTask,
  MeetupDCTask,
  SmithsonianTask,
  WashingtonianTask,
} from "./tasks";

const cron = new sst.aws.Cron("cron", {
  function: {
    handler: "packages/functions/src/events/openWeb.handler",
    link: [db, OPENWEBNINJA_API_KEY, api, normalizeEventStepFunction],
  },
  schedule: "rate(7 days)",
});

const washingtonianCron = new sst.aws.Cron("washingtonianCron", {
  task: WashingtonianTask,
  schedule: "rate(7 days)",
});

const clockoutdcCron = new sst.aws.Cron("clockoutdcCron", {
  function: {
    handler: "packages/functions/src/events/clockoutdc.handler",
    link: [db, normalizeEventStepFunction],
    timeout: "2 minutes",
  },
  schedule: "rate(7 days)",
});

const eventbriteCron = new sst.aws.Cron("eventbriteCron", {
  task: EventbriteTask,
  schedule: "rate(7 days)",
});

const dcimprovCron = new sst.aws.Cron("dcimprovCron", {
  task: DCImprovTask,
  schedule: "rate(7 days)",
});

const dccomedyloftCron = new sst.aws.Cron("dccomedyloftCron", {
  task: DCComedyLoftTask,
  schedule: "rate(7 days)",
});

// Daily copy of production DB to dev (only runs in non-production stages)
// Note: This cron will only be created in non-production stages
// The function itself checks the stage and prevents running in production
const copyProdToDevCron = new sst.aws.Cron("copyProdToDevCron", {
  function: {
    handler: "packages/functions/src/events/copyProdToDev.handler",
    link: [db],
    environment: {
      // Production table name - update this with the actual production table name
      // You can get it by running: npm run print:table:prod
      PRODUCTION_TABLE_NAME: `touchgrassdcsst-production-DbTable-bcabbfkm`,
    },
  },
  schedule: "cron(0 2 * * ? *)", // Daily at 2 AM UTC (10 PM EST previous day)
});

const dcSportsCron = new sst.aws.Cron("dcSportsCron", {
  function: {
    handler: "packages/functions/src/events/dcsports.handler",
    link: [db, normalizeEventStepFunction],
    timeout: "2 minutes",
  },
  schedule: "rate(1 day)",
});

const kennedyCenterCron = new sst.aws.Cron("kennedyCenterCron", {
  task: KennedyCenterTask,
  schedule: "rate(7 days)",
});

const generateMissingImagesCron = new sst.aws.Cron("generateMissingImagesCron", {
  function: {
    handler: "packages/functions/src/events/generateMissingImages.handler",
    link: [db, bucket],
    timeout: "10 minutes",
  },
  schedule: "rate(7 days)",
});

const newsletterCron = new sst.aws.Cron("newsletterCron", {
  function: {
    handler: "packages/functions/src/newsletter/sendNewsletter.handler",
    link: [db, OPENROUTER_API_KEY, EmailConfig],
    timeout: "5 minutes",
  },
  schedule: "cron(0 14 ? * THU *)", // Every Thursday at 10 AM EST (14:00 UTC)
});

const dailyAnalyticsCron = new sst.aws.Cron("dailyAnalyticsCron", {
  function: {
    handler: "packages/functions/src/analytics/dailyReport.handler",
    link: [db, EmailConfig],
    timeout: "2 minutes",
  },
  schedule: "cron(0 13 * * ? *)", // Daily at 8 AM EST (13:00 UTC)
});

const articleGenerationCron = new sst.aws.Cron("articleGenerationCron", {
  function: {
    handler: "packages/functions/src/articles/generateArticle.handler",
    link: [db, OPENROUTER_API_KEY, GOOGLE_MAPS_API_KEY, bucket],
    timeout: "5 minutes",
  },
  schedule: "cron(0 10 ? * MON *)", // Every Monday at 6 AM EST (10:00 UTC)
});

const ticketmasterConcertsCron = new sst.aws.Cron("ticketmasterConcertsCron", {
  function: {
    handler: "packages/functions/src/events/ticketmaster-concerts.handler",
    link: [db, normalizeEventStepFunction, TICKETMASTER_API_KEY],
    timeout: "2 minutes",
  },
  schedule: "rate(1 day)",
});

const indieVenuesCron = new sst.aws.Cron("indieVenuesCron", {
  task: IndieVenuesTask,
  schedule: "rate(7 days)",
});

const meetupdcCron = new sst.aws.Cron("meetupdcCron", {
  task: MeetupDCTask,
  schedule: "rate(7 days)",
});

const smithsonianCron = new sst.aws.Cron("smithsonianCron", {
  task: SmithsonianTask,
  schedule: "rate(7 days)",
});

const dcbareventsCron = new sst.aws.Cron("dcbareventsCron", {
  task: DCBarEventsTask,
  schedule: "rate(7 days)",
});

const loveinactiondcCron = new sst.aws.Cron("loveinactiondcCron", {
  function: {
    handler: "packages/functions/src/events/loveinactiondc.handler",
    link: [db, normalizeEventStepFunction],
    timeout: "2 minutes",
  },
  schedule: "rate(7 days)",
});

const potomacConservancyCron = new sst.aws.Cron("potomacConservancyCron", {
  function: {
    handler: "packages/functions/src/events/potomac-conservancy.handler",
    link: [db, normalizeEventStepFunction],
    timeout: "2 minutes",
  },
  schedule: "rate(7 days)",
});

const anacostiaWSCron = new sst.aws.Cron("anacostiaWSCron", {
  function: {
    handler: "packages/functions/src/events/anacostia-ws.handler",
    link: [db, normalizeEventStepFunction],
    timeout: "2 minutes",
  },
  schedule: "rate(7 days)",
});

const novacleanupsCron = new sst.aws.Cron("novacleanupsCron", {
  function: {
    handler: "packages/functions/src/events/novacleanups.handler",
    link: [db, normalizeEventStepFunction],
    timeout: "2 minutes",
  },
  schedule: "rate(7 days)",
});

export {
  anacostiaWSCron,
  articleGenerationCron,
  novacleanupsCron,
  clockoutdcCron,
  copyProdToDevCron,
  cron,
  dailyAnalyticsCron,
  dcbareventsCron,
  dccomedyloftCron,
  dcimprovCron,
  dcSportsCron,
  eventbriteCron,
  generateMissingImagesCron,
  indieVenuesCron,
  kennedyCenterCron,
  loveinactiondcCron,
  meetupdcCron,
  newsletterCron,
  potomacConservancyCron,
  smithsonianCron,
  ticketmasterConcertsCron,
  washingtonianCron,
};
