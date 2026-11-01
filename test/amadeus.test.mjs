import { describe, it, expect, vi, beforeEach } from "vitest";
import { getToken, cheapestDates } from "../amadeus-mcp/amadeus.mjs";

beforeEach(() => {
  process.env.AMADEUS_KEY = "k"; process.env.AMADEUS_SECRET = "s";
  process.env.AMADEUS_HOST = "https://test.example";
  vi.restoreAllMocks();
});

describe("amadeus", () => {
  it("fetches token once then queries flight-dates", async () => {
    const calls = [];
    global.fetch = vi.fn(async (url, init) => {
      calls.push(String(url));
      if (String(url).endsWith("/v1/security/oauth2/token")) {
        return { ok: true, json: async () => ({ access_token: "tok", expires_in: 1799 }) };
      }
      expect(String(url)).toMatch(/\/v1\/shopping\/flight-dates\?origin=(MEL|AVV)&destination=DPS&departureDate=2027-05-01&oneWay=false/);
      expect(init.headers.Authorization).toBe("Bearer tok");
      return { ok: true, json: async () => ({ data: [{ date: "2027-05-04", price: { total: "415.00" } }] }) };
    });
    const token = await getToken();
    const r = await cheapestDates("MEL", "DPS", "2027-05");
    expect(token).toBe("tok");
    expect(r.results).toEqual([{ date: "2027-05-04", price: 415 }]);
    expect(calls.filter(u => u.endsWith("oauth2/token"))).toHaveLength(1);
    await cheapestDates("AVV", "DPS", "2027-05"); // token cached
    expect(calls.filter(u => u.endsWith("oauth2/token"))).toHaveLength(1);
  });

  it("throws error on non-ok responses", async () => {
    global.fetch = vi.fn(async (url) => {
      if (String(url).endsWith("/v1/security/oauth2/token")) {
        return { ok: true, json: async () => ({ access_token: "tok", expires_in: 1799 }) };
      }
      return { ok: false, status: 429 };
    });
    await expect(cheapestDates("MEL", "DPS", "2027-05")).rejects.toThrow("Amadeus 429");
  });
});
