import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dataDir, loadConfig, watchlistsPath } from "./config";
import { Watch } from "./types";

export interface AddWatchInput {
  kind: "flight" | "hotel";
  destination: string;
  origins?: string[];      // default config origins
  depart?: string; ret?: string; nights?: number;
  threshold_aud?: number;
  cooldown_hours?: number; // default 48
}

export function loadWatchlists(): Watch[] {
  let persisted: unknown;
  try {
    persisted = JSON.parse(readFileSync(watchlistsPath(), "utf8")) as unknown;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  if (!Array.isArray(persisted)) {
    return [];
  }
  return persisted as Watch[];
}

export function saveWatchlists(w: Watch[]): void {
  mkdirSync(dataDir(), { recursive: true });
  const destination = watchlistsPath();
  const temporary = `${destination}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(w, null, 2)}\n`, "utf8");
    renameSync(temporary, destination);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // Ignore missing temporary file after a failed write.
    }
    throw error;
  }
}

export function nextId(w: Watch[]): string {
  let maxNum = 0;
  for (const watch of w) {
    if (watch && typeof watch.id === "string") {
      const match = watch.id.match(/^w-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  return `w-${String(maxNum + 1).padStart(3, "0")}`;
}

export function addWatch(input: AddWatchInput): Watch {
  const list = loadWatchlists();
  const id = nextId(list);
  const config = loadConfig();
  const origins = input.origins && input.origins.length > 0 ? [...input.origins] : [...config.origins];
  const watch: Watch = {
    id,
    kind: input.kind,
    origins,
    destination: input.destination,
    ...(input.depart !== undefined && { depart: input.depart }),
    ...(input.ret !== undefined && { ret: input.ret }),
    ...(input.nights !== undefined && { nights: input.nights }),
    ...(input.threshold_aud !== undefined && { threshold_aud: input.threshold_aud }),
    cooldown_hours: input.cooldown_hours ?? 48,
    created_at: new Date().toISOString(),
  };
  list.push(watch);
  saveWatchlists(list);
  return watch;
}

export function removeWatch(id: string): boolean {
  const list = loadWatchlists();
  const index = list.findIndex((w) => w.id === id);
  if (index === -1) {
    return false;
  }
  list.splice(index, 1);
  saveWatchlists(list);
  return true;
}
