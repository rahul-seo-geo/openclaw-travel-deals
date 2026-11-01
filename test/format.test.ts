import { describe, it, expect } from "vitest";
import { formatDeals } from "../src/format";
import type { Deal } from "../src/types";

const d = (over: Partial<Deal>): Deal => ({
  kind: "flight", origin: "MEL", destination: "DPS", price_aud: 415,
  airline_or_property: "Jetstar", stops: 0, depart_at: "2027-05-04T08:50:00+10:00",
  deep_link: "https://example.com/f", source: "letsfg", ...over,
});

describe("formatDeals", () => {
  it("sorts ascending, caps at top, renders markdown", () => {
    const md = formatDeals({ deals: [d({ price_aud: 500 }), d({ price_aud: 415, origin: "AVV" }), d({ price_aud: 460 })] }, 2);
    expect(md).toContain("## Melbourne deals (MEL + AVV)");
    expect(md).toContain("- **$415** AVV→DPS · Jetstar · 0 stops");
    expect(md).toContain("- **$460** MEL→DPS");
    expect(md).not.toContain("$500");
    expect(md).toContain("_via letsfg_");
  });
  it("renders hotels with nights", () => {
    const md = formatDeals({ deals: [d({ kind: "hotel", origin: "DPS", destination: "seminyak", price_aud: 118, nights: 7, airline_or_property: "Hotel X" })] });
    expect(md).toContain("- **$118** seminyak · Hotel X · 7 nights");
  });
});
