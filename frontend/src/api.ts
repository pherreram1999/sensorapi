export interface Reading {
  id: number;
  temperature: number | null;
  humidity: number | null;
  mq7_co: number | null;
  mq2: number | null;
  dht_error: boolean;
  created_at: number;
}

export async function fetchReadings(
  from: number,
  to: number,
  signal?: AbortSignal
): Promise<Reading[]> {
  const params = new URLSearchParams({
    from: String(from),
    to: String(to),
    limit: "5000",
  });
  const res = await fetch(`/api/readings?${params}`, { signal });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.rows as Reading[];
}
