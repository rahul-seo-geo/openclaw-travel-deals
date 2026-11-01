import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendHistory, loadHistory, pruneHistory } from "../src/history";
import type { HistoryEntry } from "../src/types";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "td-")); process.env.TRAVEL_DEALS_DATA = dir; });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); delete process.env.TRAVEL_DEALS_DATA; });

const e = (ts: string, price: number, watch = "w-001"): HistoryEntry =>
  ({ ts, watch_id: watch, best_price_aud: price, per_origin: { MEL: price }, result_count: 5 });

describe("history", () => {
  it("loads ascending and filters by watch", () => {
    appendHistory(e("2026-11-02T01:00:00Z", 500));
    appendHistory(e("2026-11-01T01:00:00Z", 520));
    appendHistory(e("2026-11-01T01:00:00Z", 300, "w-002"));
    expect(loadHistory("w-001").map(h => h.best_price_aud)).toEqual([520, 500]);
  });
  it("prunes entries older than 90 days", () => {
    appendHistory(e("2026-01-01T00:00:00Z", 999));
    appendHistory(e(new Date().toISOString(), 400));
    const removed = pruneHistory(90, new Date("2026-11-01T00:00:00Z"));
    expect(removed).toBe(1);
    expect(loadHistory()).toHaveLength(1);
  });
});
