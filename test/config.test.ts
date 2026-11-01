import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaults, loadConfig, saveConfig, dataDir, configPath } from "../src/config";

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
  it("uses default repository data path when env is unset", () => {
    delete process.env.TRAVEL_DEALS_DATA;
    expect(dataDir()).toContain("data");
  });
  it("throws on read error other than ENOENT", () => {
    delete process.env.TRAVEL_DEALS_DATA;
    const defaultData = dataDir();
    mkdirSync(defaultData, { recursive: true });
    const cfgPath = configPath();
    mkdirSync(cfgPath, { recursive: true }); // directory instead of file causes EISDIR on readFileSync
    try {
      expect(() => loadConfig()).toThrow();
    } finally {
      rmSync(cfgPath, { recursive: true, force: true });
    }
  });
  it("drops unknown keys from disk and runtime patches", () => {
    writeFileSync(join(dir, "config.json"), JSON.stringify({ top: 2, api_key: "disk-secret" }));
    expect(loadConfig()).toEqual({ ...defaults(), top: 2 });
    const saved = saveConfig({ top: 3, access_token: "patch-secret" } as unknown as Partial<ReturnType<typeof defaults>>);
    expect(saved).toEqual({ ...defaults(), top: 3 });
    expect(JSON.parse(readFileSync(join(dir, "config.json"), "utf8"))).toEqual(saved);
  });
  it("does not enable booking from disk or runtime patches", () => {
    writeFileSync(join(dir, "config.json"), JSON.stringify({ booking_enabled: true }));
    expect(loadConfig().booking_enabled).toBe(false);
    saveConfig({ booking_enabled: true } as unknown as Partial<ReturnType<typeof defaults>>);
    expect(JSON.parse(readFileSync(join(dir, "config.json"), "utf8")).booking_enabled).toBe(false);
  });
  it("normalizes invalid currency, origins, timezone and top from disk and patches", () => {
    writeFileSync(join(dir, "config.json"), JSON.stringify({ currency: "USD", origins: ["MEL", "BAD"], timezone: "UTC", top: -1 }));
    expect(loadConfig()).toEqual(defaults());
    saveConfig({ currency: "USD", origins: ["BAD"], timezone: "UTC", top: NaN } as unknown as Partial<ReturnType<typeof defaults>>);
    expect(JSON.parse(readFileSync(join(dir, "config.json"), "utf8"))).toEqual(defaults());
  });
});
