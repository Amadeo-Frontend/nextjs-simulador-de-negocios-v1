import { cookies } from "next/headers";

function getBaseUrl() {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "";
  const first = raw.split(/[,\s]+/)[0];
  return first.replace("://localhost", "://127.0.0.1").replace(/\/$/, "");
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token)
      return Response.json({ error: "unauthenticated" }, { status: 401 });

    const base = getBaseUrl();
    if (!base)
      return Response.json(
        { error: "API_URL não configurada" },
        { status: 500 }
      );

    const r = await fetch(`${base}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    let data: unknown = null;
    try {
      data = await r.json();
    } catch {
      data = await r.text().catch(() => "");
    }

    return Response.json(data ?? null, { status: r.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return Response.json({ error: msg }, { status: 500 });
  }
}
