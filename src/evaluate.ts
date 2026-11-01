import type { Watch, HistoryEntry, Verdict } from "./types";

export function evaluate(watch: Watch, entries: HistoryEntry[], now = new Date()): Verdict {
  if (!entries || entries.length === 0) {
    return {
      verdict: "silent",
      reason: "no-history",
      price_aud: 0,
    };
  }

  const sorted = [...entries].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  const latest = sorted[sorted.length - 1];
  const prior = sorted.slice(0, sorted.length - 1);
  const price = latest.best_price_aud;

  const crossed = watch.threshold_aud != null && price <= watch.threshold_aud;
  const allTimeLow = prior.length > 0 && price < Math.min(...prior.map((p) => p.best_price_aud));

  const triggered = crossed || allTimeLow;

  if (!triggered) {
    return {
      verdict: "silent",
      reason: "above-threshold",
      price_aud: price,
    };
  }

  // Cooldown check
  const lastAlertedAt = watch.pinned?.last_alerted_at;
  const lastAlertedPrice = watch.pinned?.last_alerted_price;
  const cooldownHours = watch.cooldown_hours ?? 48;
  const nowTime = now.getTime();

  let cooldownPassed = true;
  if (lastAlertedAt) {
    const alertTime = Date.parse(lastAlertedAt);
    if (!isNaN(alertTime)) {
      const elapsedMs = nowTime - alertTime;
      const cooldownMs = cooldownHours * 3600_000;
      cooldownPassed = elapsedMs >= cooldownMs;
    }
  }

  const priceDroppedBelowLastAlerted = lastAlertedPrice != null && price < lastAlertedPrice;
  const passesCooldown = cooldownPassed || priceDroppedBelowLastAlerted;

  if (!passesCooldown) {
    return {
      verdict: "silent",
      reason: "cooldown",
      price_aud: price,
    };
  }

  const reason = crossed ? "threshold" : "all-time-low";
  return {
    verdict: "alert",
    reason,
    price_aud: price,
  };
}
