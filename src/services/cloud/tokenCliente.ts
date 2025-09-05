// src/services/cloud/tokenClient.ts
export async function fetchCloudToken(endpoint: string, deviceId: string) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId })
  });
  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  return res.json() as Promise<{ wssUrl: string; user: string; pass: string; deviceId: string }>;
}
