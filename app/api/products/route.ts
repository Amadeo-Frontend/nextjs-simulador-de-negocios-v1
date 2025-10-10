export async function GET() {
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!base)
    return Response.json(
      { error: "API_URL não configurada." },
      { status: 500 }
    );
  const r = await fetch(`${base.replace(/\/$/, "")}/products`, {
    cache: "no-store",
  });
  if (!r.ok)
    return Response.json(
      { error: "Falha ao consultar products" },
      { status: r.status }
    );
  return Response.json(await r.json());
}
