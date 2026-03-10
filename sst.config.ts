// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "touchgrassdcsst",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
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
    const {
      articleGenerationCron,
      cron,
      dailyAnalyticsCron,
      washingtonianCron,
      copyProdToDevCron,
      kennedyCenterCron,
      dcSportsCron,
      generateMissingImagesCron,
      newsletterCron,
      ticketmasterConcertsCron,
      indieVenuesCron,
      meetupdcCron,
      smithsonianCron,
      dcbareventsCron,
    } = await import("./infra/cron");
    const {
      WashingtonianTask,
      ClockOutDCTask,
      EventbriteTask,
      KennedyCenterTask,
      IndieVenuesTask,
      MeetupDCTask,
      SmithsonianTask,
      DCBarEventsTask,
    } = await import("./infra/tasks");
    const { normalizeEventStepFunction } = await import(
      "./infra/step_functions"
    );
    return {
      Db: db,
      Cron: cron,
      washingtonianCron: washingtonianCron,
      ...(copyProdToDevCron && { copyProdToDevCron }),
      dailyAnalyticsCron: dailyAnalyticsCron,
      newsletterCron: newsletterCron,
      Api: api,
      Bucket: bucket,
      Web: web,
      Email: email,
      Auth: auth,
      Queue: queue,
      WashingtonianTask: WashingtonianTask,
      ClockOutDCTask: ClockOutDCTask,
      EventbriteTask: EventbriteTask,
      KennedyCenterTask: KennedyCenterTask,
      IndieVenuesTask: IndieVenuesTask,
      MeetupDCTask: MeetupDCTask,
      SmithsonianTask: SmithsonianTask,
      DCBarEventsTask: DCBarEventsTask,
      meetupdcCron: meetupdcCron,
      smithsonianCron: smithsonianCron,
      dcbareventsCron: dcbareventsCron,
      kennedyCenterCron: kennedyCenterCron,
      dcSportsCron: dcSportsCron,
      ticketmasterConcertsCron: ticketmasterConcertsCron,
      indieVenuesCron: indieVenuesCron,
      generateMissingImagesCron: generateMissingImagesCron,
      articleGenerationCron: articleGenerationCron,
      NormalizeEventStepFunction: normalizeEventStepFunction,
    };
  },
});
