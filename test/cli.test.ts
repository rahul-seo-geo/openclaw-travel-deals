import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cli = (args: string[], stdin = "", env: Record<string, string> = {}) =>
  execFileSync("node", [join(__dirname, "..", "dist", "index.js"), ...args], {
    input: stdin,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "td-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("cli", () => {
  it("watch add → record → evaluate alerts and pins", () => {
    const env = { TRAVEL_DEALS_DATA: dir };
    expect(cli(["watch", "add", "DPS", "--threshold", "450"], "", env)).toContain("w-001");
    cli(
      ["record", "w-001"],
      JSON.stringify({
        best_price_aud: 440,
        per_origin: { MEL: 440, AVV: 455 },
        result_count: 8,
      }),
      env
    );
    const v = JSON.parse(cli(["evaluate", "w-001"], "", env));
    expect(v.verdict).toBe("alert");
    const pinned = JSON.parse(cli(["watch", "list", "--json"], "", env));
    expect(pinned[0].pinned.last_alerted_price).toBe(440);
  });

  it("format renders stdin deals", () => {
    const out = cli(
      ["format"],
      JSON.stringify({
        deals: [
          {
            kind: "flight",
            origin: "AVV",
            destination: "DPS",
            price_aud: 380,
            deep_link: "https://x",
            source: "letsfg",
          },
        ],
      }),
      { TRAVEL_DEALS_DATA: dir }
    );
    expect(out).toContain("AVV→DPS");
  });

  it("budget record → status round-trip", () => {
    const env = { TRAVEL_DEALS_DATA: dir };
    cli(["budget", "record", "amadeus"], "", env);
    cli(["budget", "record", "amadeus"], "", env);
    expect(cli(["budget", "status"], "", env)).toMatch(/amadeus[\s\S]*2/);
  });

  it("watch remove works", () => {
    const env = { TRAVEL_DEALS_DATA: dir };
    cli(["watch", "add", "HND", "--threshold", "800"], "", env);
    const listBefore = JSON.parse(cli(["watch", "list", "--json"], "", env));
    expect(listBefore.length).toBe(1);
    cli(["watch", "remove", listBefore[0].id], "", env);
    const listAfter = JSON.parse(cli(["watch", "list", "--json"], "", env));
    expect(listAfter.length).toBe(0);
  });

  it("config get and set work", () => {
    const env = { TRAVEL_DEALS_DATA: dir };
    const topVal = cli(["config", "get", "top"], "", env).trim();
    expect(topVal).toBe("5");
    cli(["config", "set", "top", "10"], "", env);
    const topNew = cli(["config", "get", "top"], "", env).trim();
    expect(topNew).toBe("10");
  });
});
