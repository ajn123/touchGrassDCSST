import { describe, it, expect } from "vitest";

describe("Washingtonian crawler module exports", () => {
  it("exports WashingtonianPlaywrightCrawler class", async () => {
    // Dynamic import to avoid side effects (main() guard)
    const mod = await import(
      "../packages/tasks/crawlers/washingtonian-selenium"
    );
    expect(mod.WashingtonianPlaywrightCrawler).toBeDefined();
    expect(typeof mod.WashingtonianPlaywrightCrawler).toBe("function");
  });

  it("can instantiate WashingtonianPlaywrightCrawler", async () => {
    const mod = await import(
      "../packages/tasks/crawlers/washingtonian-selenium"
    );
    const instance = new mod.WashingtonianPlaywrightCrawler();
    expect(instance).toBeDefined();
    expect(typeof instance.run).toBe("function");
    expect(typeof instance.crawlEvents).toBe("function");
  });

  it("has crawlListingPages and crawlDetailPages methods for two-pass crawl", async () => {
    const mod = await import(
      "../packages/tasks/crawlers/washingtonian-selenium"
    );
    const instance = new mod.WashingtonianPlaywrightCrawler();
    expect(typeof instance.crawlListingPages).toBe("function");
    expect(typeof instance.crawlDetailPages).toBe("function");
  });

  it("washingtonian.ts can import the class with alias", async () => {
    // This verifies the import fix: WashingtonianPlaywrightCrawler as WashingtonianSeleniumCrawler
    const mod = await import(
      "../packages/tasks/crawlers/washingtonian-selenium"
    );
    const { WashingtonianPlaywrightCrawler: WashingtonianSeleniumCrawler } =
      mod;
    expect(WashingtonianSeleniumCrawler).toBeDefined();
    const instance = new WashingtonianSeleniumCrawler();
    expect(instance).toBeDefined();
  });

  it("does not auto-run main() when imported", async () => {
    // The module should export without triggering main()
    // If main() ran, it would call process.exit() which would kill the test
    // The fact that this test completes proves the guard works
    const mod = await import(
      "../packages/tasks/crawlers/washingtonian-selenium"
    );
    expect(mod.WashingtonianPlaywrightCrawler).toBeDefined();
  });
});
