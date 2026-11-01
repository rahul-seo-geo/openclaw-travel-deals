#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { loadConfig, saveConfig, TravelConfig } from "./config";
import { loadWatchlists, saveWatchlists, addWatch, removeWatch } from "./watchlists";
import { loadHistory, appendHistory } from "./history";
import { evaluate } from "./evaluate";
import { formatDeals } from "./format";
import type { Deal, HistoryEntry, WatchKind } from "./types";

function parseArgs(args: string[]) {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        flags[key] = val;
      } else {
        const key = arg.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith("-")) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function main() {
  const argv = process.argv.slice(2);
  const { positional, flags } = parseArgs(argv);
  const cmd = positional[0];
  const sub = positional[1];

  if (!cmd || flags.help || cmd === "help") {
    console.log(`Usage:
  travel-deals watch add <destination> [--kind flight|hotel] [--from MEL,AVV] [--dates YYYY-MM|YYYY-MM-DD] [--ret DATE] [--nights N] [--threshold AUD]
  travel-deals watch list [--json]
  travel-deals watch remove <id>
  travel-deals record <watch-id>
  travel-deals evaluate <watch-id>
  travel-deals format [--title "..."]
  travel-deals budget record <source>
  travel-deals budget status
  travel-deals config get|set <key> <value>
`);
    process.exit(0);
  }

  if (cmd === "watch") {
    if (sub === "add") {
      const destination = positional[2];
      if (!destination) {
        console.error("Error: destination required");
        process.exit(1);
      }
      const kind = (flags.kind === "hotel" ? "hotel" : "flight") as WatchKind;
      const fromStr = flags.from as string;
      const origins = fromStr ? fromStr.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
      const depart = (flags.dates || flags.depart) as string | undefined;
      const ret = flags.ret as string | undefined;
      const nights = flags.nights !== undefined ? Number(flags.nights) : undefined;
      const threshold_aud = flags.threshold !== undefined ? Number(flags.threshold) : undefined;

      const watch = addWatch({
        kind,
        destination,
        origins,
        depart,
        ret,
        nights,
        threshold_aud,
      });
      console.log(`Created watch ${watch.id} for ${watch.destination} (${watch.origins.join("+")})`);
      return;
    }

    if (sub === "list") {
      const watches = loadWatchlists();
      if (flags.json) {
        console.log(JSON.stringify(watches, null, 2));
      } else {
        if (watches.length === 0) {
          console.log("No active watches.");
        } else {
          for (const w of watches) {
            const thresh = w.threshold_aud !== undefined ? ` ≤ $${w.threshold_aud}` : "";
            console.log(`${w.id} ${w.destination} (${w.origins.join("+")})${thresh}`);
          }
        }
      }
      return;
    }

    if (sub === "remove") {
      const id = positional[2];
      if (!id) {
        console.error("Error: watch id required");
        process.exit(1);
      }
      const success = removeWatch(id);
      if (!success) {
        console.error(`Error: watch ${id} not found`);
        process.exit(1);
      }
      console.log(`Removed watch ${id}`);
      return;
    }

    console.error(`Unknown watch subcommand: ${sub}`);
    process.exit(1);
  }

  if (cmd === "record") {
    const watchId = positional[1];
    if (!watchId) {
      console.error("Error: watch id required");
      process.exit(1);
    }
    const stdin = readFileSync(0, "utf8");
    let input: { best_price_aud: number; per_origin: Record<string, number>; result_count: number };
    try {
      input = JSON.parse(stdin);
    } catch (err) {
      console.error("Error: invalid JSON on stdin", err);
      process.exit(1);
    }
    const entry: HistoryEntry = {
      ts: new Date().toISOString(),
      watch_id: watchId,
      best_price_aud: input.best_price_aud,
      per_origin: input.per_origin,
      result_count: input.result_count,
    };
    appendHistory(entry);
    console.log(`Recorded price $${input.best_price_aud} for watch ${watchId}`);
    return;
  }

  if (cmd === "evaluate") {
    const watchId = positional[1];
    if (!watchId) {
      console.error("Error: watch id required");
      process.exit(1);
    }
    const watches = loadWatchlists();
    const watch = watches.find((w) => w.id === watchId);
    if (!watch) {
      console.error(`Error: watch ${watchId} not found`);
      process.exit(1);
    }
    const entries = loadHistory(watchId);
    const now = new Date();
    const verdict = evaluate(watch, entries, now);

    if (verdict.verdict === "alert") {
      watch.pinned = {
        last_alerted_price: verdict.price_aud,
        last_alerted_at: now.toISOString(),
      };
      saveWatchlists(watches);
    }

    console.log(JSON.stringify(verdict, null, 2));
    return;
  }

  if (cmd === "format") {
    const stdin = readFileSync(0, "utf8");
    let input: { deals: Deal[]; title?: string };
    try {
      input = JSON.parse(stdin);
    } catch (err) {
      console.error("Error: invalid JSON on stdin", err);
      process.exit(1);
    }
    const config = loadConfig();
    const markdown = formatDeals({ deals: input.deals, title: input.title }, config.top);
    console.log(markdown);
    return;
  }

  if (cmd === "budget") {
    const sub = positional[1];
    if (sub === "record") {
      const source = positional[2];
      if (!source) {
        console.error("Error: source required");
        process.exit(1);
      }
      const config = loadConfig();
      const budgets = config.budgets ? { ...config.budgets } : {};
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      const sourceBudgets = budgets[source] ? { ...budgets[source] } : {};
      sourceBudgets[month] = (sourceBudgets[month] || 0) + 1;
      budgets[source] = sourceBudgets;
      saveConfig({ budgets });
      console.log(`Recorded budget call for ${source} (${month}: ${sourceBudgets[month]})`);
      return;
    }

    if (sub === "status") {
      const config = loadConfig();
      const budgets = config.budgets || {};
      console.log(JSON.stringify(budgets, null, 2));
      return;
    }

    console.error(`Unknown budget subcommand: ${sub}`);
    process.exit(1);
  }

  if (cmd === "config") {
    const sub = positional[1];
    const key = positional[2];
    const val = positional[3];

    const config = loadConfig();
    if (sub === "get") {
      if (!key) {
        console.log(JSON.stringify(config, null, 2));
        return;
      }
      const value = (config as unknown as Record<string, unknown>)[key];
      if (value === undefined) {
        console.error(`Error: config key '${key}' not found`);
        process.exit(1);
      }
      console.log(typeof value === "object" ? JSON.stringify(value) : String(value));
      return;
    }

    if (sub === "set") {
      if (!key || val === undefined) {
        console.error("Error: key and value required");
        process.exit(1);
      }
      let parsedVal: unknown = val;
      if (key === "top") {
        parsedVal = parseInt(val, 10);
      } else if (key === "origins") {
        parsedVal = val.split(",").map((s) => s.trim()).filter(Boolean);
      } else if (val === "true" || val === "false") {
        parsedVal = val === "true";
      }
      saveConfig({ [key]: parsedVal } as Partial<TravelConfig>);
      console.log(`Set ${key} = ${val}`);
      return;
    }

    console.error(`Unknown config subcommand: ${sub}`);
    process.exit(1);
  }

  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

main();
