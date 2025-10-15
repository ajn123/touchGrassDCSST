const cron = new sst.aws.Cron("cron", {
  function: "packages/functions/src/events/openWeb.handler",
  schedule: "rate(1 day)",
});

const washingtonianCron = new sst.aws.Cron("washingtonianCron", {
  handler: "packages/functions/src/events/washingtonian.handler",
  schedule: "rate(1 week)",
});
