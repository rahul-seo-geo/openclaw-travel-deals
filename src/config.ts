import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface TravelConfig {
  origins: string[];
  currency: "AUD";
  timezone: "Australia/Melbourne";
  booking_enabled: false;
  top: number;
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

export function loadConfig(): TravelConfig {
  let persisted: Partial<TravelConfig>;
  try {
    persisted = JSON.parse(readFileSync(configPath(), "utf8")) as Partial<TravelConfig>;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return defaults();
    }
    throw error;
  }
  return { ...defaults(), ...persisted };
}

export function saveConfig(patch: Partial<TravelConfig>): TravelConfig {
  const config = { ...loadConfig(), ...patch };
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
