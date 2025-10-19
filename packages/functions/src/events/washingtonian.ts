import { WashingtonianSeleniumCrawler } from "../../../scripts/src/washingtonian-selenium";
async function handler(event: any = {}) {
  try {
    console.log("🚀 Washingtonian crawl Lambda invoked", {
      source: event?.source,
      detailType: (event as any)?.detailType,
      http: (event as any)?.requestContext ? true : false,
      timestamp: new Date().toISOString(),
    });

    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Lambda timeout approaching")), 240000); // 4 minutes
    });

    const crawlerPromise = (async () => {
      const crawler = new WashingtonianSeleniumCrawler();
      await crawler.run();
      return {
        eventsAdded: "See logs for details",
        eventsFound: "See logs for details",
      };
    })();

    // Race between crawler completion and timeout
    const crawlerResult = await Promise.race([crawlerPromise, timeoutPromise]);

    const response = {
      ok: true,
      message: `Washingtonian crawl completed successfully`,
      eventsAdded: crawlerResult.eventsAdded,
      eventsFound: crawlerResult.eventsFound,
      timestamp: new Date().toISOString(),
    };

    // Support HTTP integrations
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("❌ Washingtonian crawl failed in handler:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: (error as Error)?.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
}

export { handler };
export default handler;
