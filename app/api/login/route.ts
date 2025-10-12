import { cookies } from "next/headers";

function normalizeBase(u?: string | null) {
  if (!u) return "";
  const first = u.split(/[,\s]+/)[0];
  return first.replace("://localhost", "://127.0.0.1").replace(/\/$/, "");
}

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const base =
    normalizeBase(process.env.API_URL) ||
    normalizeBase(process.env.NEXT_PUBLIC_API_URL);
  if (!base) {
    return Response.json({ error: "API_URL não configurada" }, { status: 500 });
  }

  const r = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return Response.json(
      { error: txt || "Credenciais inválidas" },
      { status: r.status }
    );
  }

  const data: { access_token: string; exp: number } = await r.json();

  const jar = await cookies(); // <- IMPORTANTE
  jar.set({
    name: "session",
    value: data.access_token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(data.exp * 1000),
  });

  return Response.json({ ok: true, exp: data.exp });
}
