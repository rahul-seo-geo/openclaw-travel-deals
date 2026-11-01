export type Source = "letsfg" | "flightpowers" | "amadeus";
export type WatchKind = "flight" | "hotel";

export interface Watch {
  id: string;                 // "w-001" style
  kind: WatchKind;
  origins: string[];          // ["MEL","AVV"]
  destination: string;        // IATA for flights, city slug for hotels
  depart?: string;            // "YYYY-MM-DD" or "YYYY-MM" (flexible month)
  ret?: string;               // "YYYY-MM-DD"
  nights?: number;            // hotels only
  threshold_aud?: number;
  cooldown_hours: number;     // default 48
  pinned?: { last_alerted_price?: number; last_alerted_at?: string };
  created_at: string;         // ISO
}

export interface Deal {
  kind: WatchKind;
  origin: string;
  destination: string;
  price_aud: number;
  airline_or_property?: string;
  stops?: number;
  depart_at?: string;         // ISO
  nights?: number;
  deep_link: string;
  source: Source;
}

export interface HistoryEntry {
  ts: string;                 // ISO
  watch_id: string;
  best_price_aud: number;
  per_origin: Record<string, number>;  // {"MEL":415,"AVV":380}
  result_count: number;
}

export interface Verdict {
  verdict: "alert" | "silent";
  reason: string;
  price_aud: number;
}
