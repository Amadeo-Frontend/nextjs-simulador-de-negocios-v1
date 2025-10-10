export async function POST(req: Request) {
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!base)
    return Response.json(
      { error: "API_URL não configurada." },
      { status: 500 }
    );
  const body = await req.json();

  const r = await fetch(`${base.replace(/\/$/, "")}/simular`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok)
    return Response.json({ error: "Falha ao simular" }, { status: r.status });
  return Response.json(await r.json());
}
