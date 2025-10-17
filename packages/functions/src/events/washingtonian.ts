import { WashingtonianCrawler } from "../../../scripts/src/washingtonian-crawler";

async function handler(event: any = {}) {
  try {
    console.log("🚀 Washingtonian crawl Lambda invoked", {
      source: event?.source,
      detailType: (event as any)?.detailType,
      http: (event as any)?.requestContext ? true : false,
    });

    const crawler = new WashingtonianCrawler();
    await crawler.run();

    const response = {
      ok: true,
      message: "Washingtonian crawl completed",
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
      body: JSON.stringify({ ok: false, error: (error as Error)?.message }),
    };
  }
}

export { handler };
export default handler;
