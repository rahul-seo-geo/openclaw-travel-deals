import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addWatch, loadWatchlists, removeWatch, nextId } from "../src/watchlists";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "td-")); process.env.TRAVEL_DEALS_DATA = dir; });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); delete process.env.TRAVEL_DEALS_DATA; });

describe("watchlists", () => {
  it("adds a watch with MEL+AVV default origins and sequential ids", () => {
    const w1 = addWatch({ kind: "flight", destination: "DPS", depart: "2027-05", threshold_aud: 450 });
    expect(w1.origins).toEqual(["MEL", "AVV"]);
    expect(w1.id).toBe("w-001");
    const w2 = addWatch({ kind: "hotel", destination: "seminyak", nights: 7 });
    expect(w2.id).toBe("w-002");
    expect(loadWatchlists()).toHaveLength(2);
  });
  it("pins a single origin when asked", () => {
    const w = addWatch({ kind: "flight", destination: "SYD", origins: ["AVV"] });
    expect(w.origins).toEqual(["AVV"]);
  });
  it("removes by id, false when missing", () => {
    addWatch({ kind: "flight", destination: "DPS" });
    expect(removeWatch("w-001")).toBe(true);
    expect(removeWatch("w-001")).toBe(false);
  });
  it("nextId continues the sequence", () => {
    expect(nextId([{ id: "w-002" } as any])).toBe("w-003");
  });
});
