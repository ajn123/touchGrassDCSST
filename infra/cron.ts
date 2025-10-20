import { search } from "./opensearch";

const cron = new sst.aws.Cron("cron", {
  function: {
    handler: "packages/functions/src/events/openWeb.handler",
    link: [search],
  },
  schedule: "rate(1 day)",
});

const washingtonianCron = new sst.aws.Cron("washingtonianCron", {
  function: {
    handler: "packages/tasks/crawlers/washingtonian.handler",
    link: [search],
    timeout: "5 minutes",
    memory: "1024 MB",
    nodejs: {
      install: ["selenium-webdriver", "@sparticuz/chromium"],
    },
  },
  // Runs every Wednesday at 2:00 AM UTC
  schedule: "rate(7 days)",
});

export { cron, washingtonianCron };
