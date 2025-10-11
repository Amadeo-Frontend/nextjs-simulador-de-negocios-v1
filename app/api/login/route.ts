// app/api/login/route.ts  (ou src/app/api/login/route.ts)
import { cookies } from "next/headers";

function getBaseUrl() {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "";
  const first = raw.split(/[,\s]+/)[0]; // evita vírgulas/espacos
  return first.replace("://localhost", "://127.0.0.1").replace(/\/$/, "");
}

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const base = getBaseUrl();
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
      { error: txt || "Login inválido" },
      { status: r.status }
    );
  }

  const data = await r.json(); // { access_token, exp }

  // cookies() -> Promise<ReadonlyRequestCookies> no seu Next => aguarde:
  const cookieStore = await cookies();
  cookieStore.set({
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
