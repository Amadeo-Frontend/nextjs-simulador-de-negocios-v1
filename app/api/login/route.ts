import { cookies } from "next/headers";

function getBaseUrl() {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "";
  // pega somente o primeiro, caso tenha sido salvo "prod,dev"
  const first = raw.split(/[,\s]+/)[0] || "";
  return first.replace("://localhost", "://127.0.0.1").replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const base = getBaseUrl();
    if (!base) {
      return Response.json(
        { error: "API_URL não configurada" },
        { status: 500 }
      );
    }

    const r = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      // como é chamada servidor→servidor, não precisa CORS
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return Response.json(
        { error: txt || "Credenciais inválidas" },
        { status: r.status }
      );
    }

    const data: { access_token: string; exp: number } = await r.json();

    (await cookies()).set({
      name: "session",
      value: data.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(data.exp * 1000),
    });

    return Response.json({ ok: true, exp: data.exp });
  } catch (e) {
    return Response.json({ error: "Falha ao autenticar" }, { status: 500 });
  }
}
