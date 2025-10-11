import { cookies } from "next/headers";

function getBaseUrl() {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "";
  const first = raw.split(/[,\s]+/)[0];
  return first.replace("://localhost", "://127.0.0.1").replace(/\/$/, "");
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  const base = getBaseUrl();
  if (!base)
    return Response.json({ error: "API_URL não configurada" }, { status: 500 });

  const payload = await req.json();

  const r = await fetch(`${base}/simular`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json();
  return Response.json(data, { status: r.status });
}
