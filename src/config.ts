import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MELBOURNE_ORIGINS } from "./airports";

export interface TravelConfig {
  origins: string[];
  currency: "AUD";
  timezone: "Australia/Melbourne";
  booking_enabled: false;
  top: number;
  budgets?: Record<string, Record<string, number>>;
}

export function dataDir(): string {
  return process.env.TRAVEL_DEALS_DATA || join(__dirname, "..", "data");
}

export function configPath(): string {
  return join(dataDir(), "config.json");
}

export function watchlistsPath(): string {
  return join(dataDir(), "watchlists.json");
}

export function historyPath(): string {
  return join(dataDir(), "price-history.json");
}

export function defaults(): TravelConfig {
  return {
    origins: ["MEL", "AVV"],
    currency: "AUD",
    timezone: "Australia/Melbourne",
    booking_enabled: false,
    top: 5,
  };
}

function normalizeConfig(value: unknown, base: TravelConfig): TravelConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return base;
  const raw = value as Record<string, unknown>;
  return {
    origins: Array.isArray(raw.origins) && raw.origins.length > 0 &&
      raw.origins.every((origin) => typeof origin === "string" && MELBOURNE_ORIGINS.includes(origin))
      ? [...raw.origins] : [...base.origins],
    currency: raw.currency === "AUD" ? "AUD" : base.currency,
    timezone: raw.timezone === "Australia/Melbourne" ? "Australia/Melbourne" : base.timezone,
    booking_enabled: false,
    top: typeof raw.top === "number" && Number.isSafeInteger(raw.top) && raw.top > 0
      ? raw.top : base.top,
    budgets: typeof raw.budgets === "object" && raw.budgets !== null && !Array.isArray(raw.budgets)
      ? (raw.budgets as Record<string, Record<string, number>>)
      : base.budgets,
  };
}

export function loadConfig(): TravelConfig {
  let persisted: unknown;
  try {
    persisted = JSON.parse(readFileSync(configPath(), "utf8")) as unknown;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return defaults();
    }
    throw error;
  }
  return normalizeConfig(persisted, defaults());
}

export function saveConfig(patch: Partial<TravelConfig>): TravelConfig {
  const config = normalizeConfig(patch, loadConfig());
  mkdirSync(dataDir(), { recursive: true });
  const destination = configPath();
  const temporary = `${destination}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    renameSync(temporary, destination);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // Ignore missing temporary file after a failed write.
    }
    throw error;
  }
  return config;
}
