import { describe, it, expect } from "vitest";
import { MELBOURNE_ORIGINS, AIRPORT_NAMES } from "../src/airports";
import type { Watch } from "../src/types";

describe("airports", () => {
  it("defaults to both Melbourne airports", () => {
    expect(MELBOURNE_ORIGINS).toEqual(["MEL", "AVV"]);
    expect(AIRPORT_NAMES.MEL).toBe("Tullamarine");
    expect(AIRPORT_NAMES.AVV).toBe("Avalon");
  });
  it("Watch shape compiles", () => {
    const w: Watch = {
      id: "w-001", kind: "flight", origins: MELBOURNE_ORIGINS,
      destination: "DPS", depart: "2027-05", cooldown_hours: 48,
      created_at: new Date().toISOString(),
    };
    expect(w.origins).toHaveLength(2);
  });
});
