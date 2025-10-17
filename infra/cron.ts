const cron = new sst.aws.Cron("cron", {
  function: "packages/functions/src/events/openWeb.handler",
  schedule: "rate(1 day)",
});

const washingtonianCron = new sst.aws.Cron("washingtonianCron", {
  function: "packages/functions/src/events/washingtonian.handler",
  // Runs every Wednesday at 2:00 AM UTC
  schedule: "rate(7 days)",
});
