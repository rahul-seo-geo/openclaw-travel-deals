import type { Deal } from "./types";

export interface FormatInput {
  deals: Deal[];
  title?: string;
}

export function formatDeals(input: FormatInput, top = 5): string {
  const sorted = [...input.deals].sort((a, b) => a.price_aud - b.price_aud);
  const topDeals = sorted.slice(0, top);

  const title = input.title ?? "Melbourne deals (MEL + AVV)";
  const lines: string[] = [`## ${title}`];

  for (const deal of topDeals) {
    const priceStr = `$${Math.round(deal.price_aud).toLocaleString("en-AU")}`;
    const propertyOrAirline = deal.airline_or_property ?? "";
    const deepLink = deal.deep_link;

    if (deal.kind === "flight") {
      const route = `${deal.origin}→${deal.destination}`;
      const stops = `${deal.stops ?? 0} stops`;
      const dateStr = formatDate(deal.depart_at);
      const parts = [route];
      if (propertyOrAirline) parts.push(propertyOrAirline);
      parts.push(stops);
      if (dateStr) parts.push(dateStr);
      parts.push(`[book](<${deepLink}>)`);
      lines.push(`- **${priceStr}** ${parts.join(" · ")}`);
    } else {
      const destination = deal.destination;
      const nights = deal.nights ?? 1;
      const parts = [destination];
      if (propertyOrAirline) parts.push(propertyOrAirline);
      parts.push(`${nights} nights`);
      parts.push(`[book](<${deepLink}>)`);
      lines.push(`- **${priceStr}** ${parts.join(" · ")}`);
    }
  }

  if (topDeals.length > 0) {
    lines.push(`_via ${topDeals[0].source}_`);
  }

  return lines.join("\n");
}

function formatDate(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat("en-AU", {
    month: "short",
    day: "numeric",
    timeZone: "Australia/Melbourne",
  }).format(date);
}
