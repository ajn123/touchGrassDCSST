import { describe, it, expect } from "vitest";
import {
  isInvalidTitle,
  INVALID_TITLE_PATTERNS,
} from "../packages/tasks/crawlers/dcimprov";

describe("DC Improv title filtering", () => {
  describe("INVALID_TITLE_PATTERNS", () => {
    it("contains expected non-event patterns", () => {
      expect(INVALID_TITLE_PATTERNS).toContain("about the show");
      expect(INVALID_TITLE_PATTERNS).toContain("online showroom");
      expect(INVALID_TITLE_PATTERNS).toContain("dc improv");
    });
  });

  describe("isInvalidTitle", () => {
    it("rejects 'About the Show'", () => {
      expect(isInvalidTitle("About the Show")).toBe(true);
    });

    it("rejects 'About The Show' (case insensitive)", () => {
      expect(isInvalidTitle("About The Show")).toBe(true);
    });

    it("rejects 'about the show' (lowercase)", () => {
      expect(isInvalidTitle("about the show")).toBe(true);
    });

    it("rejects 'Online Showroom'", () => {
      expect(isInvalidTitle("Online Showroom")).toBe(true);
    });

    it("rejects 'DC Improv'", () => {
      expect(isInvalidTitle("DC Improv")).toBe(true);
    });

    it("rejects 'FAQ'", () => {
      expect(isInvalidTitle("FAQ")).toBe(true);
    });

    it("rejects 'Gift Cards'", () => {
      expect(isInvalidTitle("Gift Cards")).toBe(true);
    });

    it("rejects 'Private Events'", () => {
      expect(isInvalidTitle("Private Events")).toBe(true);
    });

    it("rejects titles with leading/trailing whitespace", () => {
      expect(isInvalidTitle("  About the Show  ")).toBe(true);
    });

    it("accepts valid comedian names", () => {
      expect(isInvalidTitle("Francis Ellis")).toBe(false);
      expect(isInvalidTitle("Dov Davidoff")).toBe(false);
      expect(isInvalidTitle("Suzanne Lambert: Mean But True Live")).toBe(false);
    });

    it("accepts valid show names", () => {
      expect(isInvalidTitle("Stand-Up Showcase")).toBe(false);
      expect(isInvalidTitle("Couples Therapy")).toBe(false);
      expect(isInvalidTitle("The Newly Dead Game 2")).toBe(false);
      expect(isInvalidTitle("Drag & Comedy Brunch")).toBe(false);
    });

    it("accepts empty string as valid (separate check handles empty)", () => {
      // Empty titles are handled by a separate !title check in the crawler
      expect(isInvalidTitle("")).toBe(false);
    });
  });
});
