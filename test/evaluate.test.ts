import { describe, it, expect } from "vitest";
import { evaluate } from "../src/evaluate";
import type { Watch, HistoryEntry } from "../src/types";

const base: Watch = {
  id: "w-001", kind: "flight", origins: ["MEL", "AVV"], destination: "DPS",
  depart: "2027-05", cooldown_hours: 48, created_at: "2026-11-01T00:00:00Z",
  threshold_aud: 450,
};
const h = (ts: string, price: number): HistoryEntry =>
  ({ ts, watch_id: "w-001", best_price_aud: price, per_origin: { MEL: price, AVV: price + 20 }, result_count: 8 });

describe("evaluate", () => {
  it("alerts when price crosses the threshold", () => {
    const v = evaluate(base, [h("2026-11-01T00:00:00Z", 440)], new Date("2026-11-01T09:00:00Z"));
    expect(v).toMatchObject({ verdict: "alert", price_aud: 440 });
  });
  it("alerts on a new all-time low even above threshold", () => {
    const w = { ...base, threshold_aud: undefined };
    const v = evaluate(w, [h("2026-10-01T00:00:00Z", 600), h("2026-11-01T00:00:00Z", 480)],
      new Date("2026-11-01T09:00:00Z"));
    expect(v.verdict).toBe("alert");
  });
  it("stays silent within cooldown after an alert", () => {
    const w: Watch = { ...base, pinned: { last_alerted_price: 445, last_alerted_at: "2026-11-01T08:00:00Z" } };
    const v = evaluate(w, [h("2026-11-01T00:00:00Z", 448)], new Date("2026-11-01T20:00:00Z"));
    expect(v.verdict).toBe("silent");
  });
  it("overrides cooldown when price drops below last alerted price", () => {
    const w: Watch = { ...base, pinned: { last_alerted_price: 445, last_alerted_at: "2026-11-01T08:00:00Z" } };
    const v = evaluate(w, [h("2026-11-01T00:00:00Z", 430)], new Date("2026-11-01T20:00:00Z"));
    expect(v.verdict).toBe("alert");
  });
  it("silent when no history or above threshold", () => {
    expect(evaluate(base, [], new Date()).verdict).toBe("silent");
    expect(evaluate(base, [h("2026-11-01T00:00:00Z", 480)], new Date("2026-11-01T09:00:00Z")).verdict).toBe("silent");
  });
});
