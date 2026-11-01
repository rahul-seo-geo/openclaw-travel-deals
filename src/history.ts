import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dataDir, historyPath } from "./config";
import type { HistoryEntry } from "./types";

export function loadHistory(watchId?: string): HistoryEntry[] {
  let persisted: unknown;
  try {
    persisted = JSON.parse(readFileSync(historyPath(), "utf8")) as unknown;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  if (!Array.isArray(persisted)) {
    return [];
  }
  const entries = persisted as HistoryEntry[];
  const filtered = watchId ? entries.filter((e) => e.watch_id === watchId) : entries;
  return filtered.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

function saveHistory(entries: HistoryEntry[]): void {
  mkdirSync(dataDir(), { recursive: true });
  const destination = historyPath();
  const temporary = `${destination}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
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

export function appendHistory(entry: HistoryEntry): void {
  // Load raw un-sorted entries so we preserve all watch entries
  let persisted: unknown;
  try {
    persisted = JSON.parse(readFileSync(historyPath(), "utf8")) as unknown;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      persisted = [];
    } else {
      throw error;
    }
  }
  const entries = Array.isArray(persisted) ? (persisted as HistoryEntry[]) : [];
  entries.push(entry);
  saveHistory(entries);
}

export function pruneHistory(days = 90, now = new Date()): number {
  let persisted: unknown;
  try {
    persisted = JSON.parse(readFileSync(historyPath(), "utf8")) as unknown;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }
  const entries = Array.isArray(persisted) ? (persisted as HistoryEntry[]) : [];
  const threshold = now.getTime() - days * 86400_000;
  const kept = entries.filter((e) => new Date(e.ts).getTime() >= threshold);
  const removed = entries.length - kept.length;
  if (removed > 0) {
    saveHistory(kept);
  }
  return removed;
}
