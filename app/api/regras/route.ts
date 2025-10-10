// app/api/regras/route.ts
export async function GET() {
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    return Response.json(
      { error: "API_URL não configurada." },
      { status: 500 }
    );
  }
  const url = `${base.replace(/\/$/, "")}/regras`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: "Falha ao consultar a API externa." },
        { status: res.status }
      );
    }
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: "Erro de rede." }, { status: 502 });
  }
}
