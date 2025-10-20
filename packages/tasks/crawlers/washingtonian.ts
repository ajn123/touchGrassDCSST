import { WashingtonianSeleniumCrawler } from "./washingtonian-selenium";

async function handler(event: any = {}) {
  console.log("🚀 Washingtonian crawl Lambda invoked", {
    source: event?.source,
    detailType: (event as any)?.detailType,
    http: (event as any)?.requestContext ? true : false,
    timestamp: new Date().toISOString(),
    eventKeys: Object.keys(event),
  });

  try {
    // Log environment info for debugging
    console.log("🔍 Environment info:", {
      NODE_ENV: process.env.NODE_ENV,
      AWS_REGION: process.env.AWS_REGION,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
      AWS_LAMBDA_EXEC_WRAPPER: process.env.AWS_LAMBDA_EXEC_WRAPPER,
    });

    // Test if the import is working
    console.log("🧪 Testing WashingtonianSeleniumCrawler import...");
    console.log(
      "✅ WashingtonianSeleniumCrawler imported successfully:",
      typeof WashingtonianSeleniumCrawler
    );

    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Lambda timeout approaching")), 240000); // 4 minutes
    });

    const crawlerPromise = (async () => {
      console.log("🔧 Creating WashingtonianSeleniumCrawler instance...");
      const crawler = new WashingtonianSeleniumCrawler();
      console.log("✅ Crawler instance created successfully");

      console.log("🏃 Starting crawler run...");
      await crawler.run();
      console.log("✅ Crawler run completed successfully");

      return {
        eventsAdded: "See logs for details",
        eventsFound: "See logs for details",
      };
    })();

    // Race between crawler completion and timeout
    const crawlerResult = (await Promise.race([
      crawlerPromise,
      timeoutPromise,
    ])) as {
      eventsAdded: string;
      eventsFound: string;
    };

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
    console.error("❌ Error details:", {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
      cause: (error as Error)?.cause,
    });

    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: (error as Error)?.message,
        errorName: (error as Error)?.name,
        timestamp: new Date().toISOString(),
      }),
    };
  }
}

export { handler };
export default handler;
