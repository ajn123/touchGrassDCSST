const cron = new sst.aws.Cron("cron", {
  function: "packages/functions/src/events/openWeb.handler",
  schedule: "rate(1 day)",
});
