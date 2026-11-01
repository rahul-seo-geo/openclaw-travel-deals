let cachedToken = null;
let tokenExpiresAt = 0;

export async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }
  const host = process.env.AMADEUS_HOST || "https://test.api.amadeus.com";
  const clientId = process.env.AMADEUS_KEY;
  const clientSecret = process.env.AMADEUS_SECRET;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${host}/v1/security/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Amadeus auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  const expiresIn = data.expires_in || 1799;
  tokenExpiresAt = now + (expiresIn - 60) * 1000;
  return cachedToken;
}

export async function cheapestDates(origin, destination, month) {
  const token = await getToken();
  const host = process.env.AMADEUS_HOST || "https://test.api.amadeus.com";
  const url = `${host}/v1/shopping/flight-dates?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&departureDate=${encodeURIComponent(month)}-01&oneWay=false`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Amadeus ${res.status}`);
  }

  const json = await res.json();
  const data = json.data || [];
  const results = data.map(item => ({
    date: item.date,
    price: Number(item.price?.total || item.price || 0)
  }));

  return { results };
}
