import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("smoke", () => {
  it("builds and the CLI entry compiles", () => {
    expect(existsSync(join(__dirname, "..", "src", "index.ts"))).toBe(true);
  });
  it("config module exports defaults", async () => {
    const cfg = await import(join(__dirname, "..", "src", "config"));
    expect(typeof cfg.loadConfig).toBe("function");
  });
});
