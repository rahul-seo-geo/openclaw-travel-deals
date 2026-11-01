import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaults, loadConfig, saveConfig, dataDir } from "../src/config";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "td-")); process.env.TRAVEL_DEALS_DATA = dir; });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); delete process.env.TRAVEL_DEALS_DATA; });

describe("config", () => {
  it("defaults to Melbourne", () => {
    expect(defaults()).toMatchObject({
      origins: ["MEL", "AVV"], currency: "AUD",
      timezone: "Australia/Melbourne", booking_enabled: false, top: 5,
    });
  });
  it("persists overrides", () => {
    saveConfig({ top: 3 });
    expect(loadConfig().top).toBe(3);
    expect(loadConfig().origins).toEqual(["MEL", "AVV"]);
  });
  it("data dir respects env", () => {
    expect(dataDir()).toBe(dir);
  });
});
