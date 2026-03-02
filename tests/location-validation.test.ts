import { describe, it, expect } from "vitest";
import { hasValidLocation } from "../packages/frontend/src/components/EntityDetail";

describe("Location validation - hasValidLocation", () => {
  describe("rejects UNKNOWN locations", () => {
    it("rejects 'UNKNOWN'", () => {
      expect(hasValidLocation("UNKNOWN")).toBe(false);
    });

    it("rejects 'unknown'", () => {
      expect(hasValidLocation("unknown")).toBe(false);
    });

    it("rejects 'UNKNOWN | Herndon, VA'", () => {
      expect(hasValidLocation("UNKNOWN | Herndon, VA")).toBe(false);
    });

    it("rejects 'Unknown Location'", () => {
      expect(hasValidLocation("Unknown Location")).toBe(false);
    });

    it("rejects 'UNKNOWN | Washington, DC'", () => {
      expect(hasValidLocation("UNKNOWN | Washington, DC")).toBe(false);
    });
  });

  describe("rejects empty/null locations", () => {
    it("rejects undefined", () => {
      expect(hasValidLocation(undefined)).toBe(false);
    });

    it("rejects empty string", () => {
      expect(hasValidLocation("")).toBe(false);
    });

    it("rejects whitespace-only string", () => {
      expect(hasValidLocation("   ")).toBe(false);
    });
  });

  describe("accepts valid locations", () => {
    it("accepts a full street address", () => {
      expect(hasValidLocation("1140 Connecticut Ave. NW, Washington, DC 20036")).toBe(true);
    });

    it("accepts Kennedy Center address", () => {
      expect(hasValidLocation("2700 F Street NW, Washington, DC 20566")).toBe(true);
    });

    it("accepts a venue name", () => {
      expect(hasValidLocation("DC Improv")).toBe(true);
    });

    it("accepts city/state format", () => {
      expect(hasValidLocation("Washington, DC")).toBe(true);
    });

    it("accepts venue with city", () => {
      expect(hasValidLocation("Hollin Hall Shopping Center | Alexandria, VA")).toBe(true);
    });
  });
});
