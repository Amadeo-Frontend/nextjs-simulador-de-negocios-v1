import { cookies } from "next/headers";

function getBaseUrl() {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "";
  const first = raw.split(/[,\s]+/)[0];
  return first.replace("://localhost", "://127.0.0.1").replace(/\/$/, "");
}

export async function GET() {
  const jar = await cookies(); // <- IMPORTANTE
  const token = jar.get("session")?.value;
  if (!token) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const base = getBaseUrl();
  const r = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await r.json().catch(() => ({}));
  return Response.json(data, { status: r.status });
}
