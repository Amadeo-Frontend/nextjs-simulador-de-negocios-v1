'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

/* ===== Tipos ===== */
type Product = {
  sku: string;
  nome: string;
  preco_venda: number;
  custo: number;
};

type OrderItem = {
  id: string;
  sku: string;
  qty: number;
  bonusReais: number;   // bônus manual em R$
  bonusPacotes: number; // pacotes grátis manuais
};

type PacoteSugestao = { sku: string; qty: number; custo_total: number };

type Simulacao = {
  receita: number;
  cogs: number;
  margem_sem_bonus: number;
  bonus_dinheiro: number;
  margem_com_dinheiro: number;
  pacotes_gratis: PacoteSugestao[];
  custo_pacotes: number;
  margem_com_pacotes: number;
  regra_aplicada?: {
    faixa_inicio: number;
    faixa_fim: number;
    bonus_percentual: number;
    pacotes_gratis: number;
  };
};

type ApiError = { error?: string; detail?: string; message?: string };

/* ===== Helpers ===== */
const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number) => (v * 100).toFixed(2) + '%';

async function safeJson<T = unknown>(r: Response): Promise<T | undefined> {
  try { return (await r.json()) as T; } catch { return undefined; }
}
async function safeText(r: Response): Promise<string | undefined> {
  try { return await r.text(); } catch { return undefined; }
}
function extractApiMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const b = body as ApiError;
    const msg = b.error ?? b.detail ?? b.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}

/* ===== Página ===== */
export default function Home() {
  const router = useRouter();

  const [produtos, setProdutos] = useState<Product[]>([]);
  const [carregando, setCarregando] = useState(true);

  const idSeq = useRef(0);
  const [itens, setItens] = useState<OrderItem[]>([
    { id: 'i0', sku: '', qty: 1, bonusReais: 0, bonusPacotes: 0 },
  ]);
  useEffect(() => { idSeq.current = 1; }, []);

  const [sim, setSim] = useState<Simulacao | null>(null);

  /* ===== Botão sair ===== */
  async function handleLogout() {
    try {
      const r = await fetch('/api/logout', { method: 'POST' });
      if (!r.ok) {
        const body = await safeJson(r);
        const msg = extractApiMessage(body, 'Falha ao encerrar sessão.');
        toast.error(msg);
        return;
        }
      toast.success('Sessão encerrada.');
      router.replace('/login');
    } catch {
      toast.error('Falha ao encerrar sessão.');
    }
  }

  /* ===== Carregar produtos ===== */
  useEffect(() => {
    let stopped = false;
    (async () => {
      setCarregando(true);
      try {
        const r = await fetch('/api/products', { cache: 'no-store' });
        if (!r.ok) {
          const body = await safeJson(r);
          let msg = extractApiMessage(body, 'Falha ao carregar produtos.');
          if (!body) {
            const txt = await safeText(r);
            if (txt && txt.trim()) msg = txt;
          }
          throw new Error(msg);
        }
        const data = (await r.json()) as Product[];
        if (!stopped) {
          setProdutos(data ?? []);
          toast.success('Produtos carregados.');
        }
      } catch (e) {
        if (!stopped) toast.error(e instanceof Error ? e.message : 'Falha ao carregar produtos.');
      } finally {
        if (!stopped) setCarregando(false);
      }
    })();
    return () => { stopped = true; };
  }, []);

  /* ===== Mapas / totais ===== */
  const mapaProdutos = useMemo(
    () => new Map(produtos.map((p) => [p.sku, p])),
    [produtos]
  );

  const totaisBase = useMemo(() => {
    return itens.reduce(
      (acc, it) => {
        const p = mapaProdutos.get(it.sku);
        if (!p) return acc;
        acc.receita += p.preco_venda * it.qty;
        acc.cogs += p.custo * it.qty;
        return acc;
      },
      { receita: 0, cogs: 0 }
    );
  }, [itens, mapaProdutos]);

  const bonusManuais = useMemo(() => {
    let bonusDinheiro = 0;
    let custoPacotes = 0;
    for (const it of itens) {
      const p = mapaProdutos.get(it.sku);
      if (!p) continue;
      bonusDinheiro += Math.max(0, it.bonusReais || 0);
      custoPacotes += Math.max(0, it.bonusPacotes || 0) * p.custo;
    }
    const { receita, cogs } = totaisBase;
    const margemComManuais =
      receita > 0 ? (receita - cogs - bonusDinheiro - custoPacotes) / receita : 0;
    return { bonusDinheiro, custoPacotes, margemComManuais };
  }, [itens, mapaProdutos, totaisBase]);

  /* ===== Ações ===== */
  const novoId = () => `i${idSeq.current++}`;
  const addLinha = () =>
    setItens((prev) => [
      ...prev,
      { id: novoId(), sku: '', qty: 1, bonusReais: 0, bonusPacotes: 0 },
    ]);
  const rmLinha = (id: string) =>
    setItens((prev) => prev.filter((i) => i.id !== id));
  const atualizarItem = (id: string, patch: Partial<Omit<OrderItem, 'id'>>) =>
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const simular = async () => {
    setSim(null);
    const payload = {
      itens: itens
        .filter((i) => i.sku && i.qty > 0)
        .map(({ sku, qty }) => ({ sku, qty })),
    };
    if (!payload.itens.length) {
      toast.error('Adicione ao menos um item com SKU e quantidade.');
      return;
    }
    try {
      const r = await fetch('/api/simular', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const body = await safeJson(r);
        let msg = extractApiMessage(body, 'Falha na simulação.');
        if (!body) {
          const txt = await safeText(r);
          if (txt && txt.trim()) msg = txt;
        }
        throw new Error(msg);
      }
      const data = (await r.json()) as Simulacao;
      setSim(data);
      toast.success('Simulação concluída.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro desconhecido ao simular.');
    }
  };

  /* ===== Render ===== */
  return (
    <main className="min-h-[calc(100vh-3.5rem)] p-6">
      {/* Barra superior com toggle e sair */}
      <div className="mx-auto max-w-6xl mb-4 flex items-center justify-end gap-2">
        <ModeToggle />
        <Button variant="destructive" onClick={handleLogout} className="gap-2">
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>

      <div className="mx-auto max-w-6xl rounded-2xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Simulador de Pedido &amp; Bonificação</h1>
          <p className="text-muted-foreground">
            Digite o <b>SKU</b> (3–4 dígitos) ou selecione o produto — ambos funcionam.
          </p>
        </header>

        {/* datalist global */}
        <datalist id="dlist-produtos">
          {produtos.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.nome}
            </option>
          ))}
        </datalist>

        {/* Cabeçalho de colunas (fixa alinhamento) */}
        <div className="grid grid-cols-[140px_1fr_110px_120px_110px_48px] gap-3 px-1 text-sm font-medium text-muted-foreground">
          <div>SKU</div>
          <div>Produto (opcional)</div>
          <div className="text-center">Qtd</div>
          <div className="text-center">Bônus (R$)</div>
          <div className="text-center">Pacotes</div>
          <div />
        </div>

        {/* Linhas do pedido */}
        <div className="space-y-3">
          {itens.map((it) => {
            const skuId = `sku-${it.id}`;
            const selectId = `select-${it.id}`;
            const qtyId = `qty-${it.id}`;
            const bonusReaisId = `bonusR-${it.id}`;
            const bonusPacId = `bonusP-${it.id}`;

            return (
              <div
                key={it.id}
                className="grid grid-cols-[140px_1fr_110px_120px_110px_48px] gap-3 items-center"
              >
                {/* SKU (texto com datalist) */}
                <div>
                  <input
                    id={skuId}
                    list="dlist-produtos"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full h-10 border rounded-md px-2 bg-background"
                    placeholder="ex: 707"
                    value={it.sku}
                    onChange={(e) =>
                      atualizarItem(it.id, { sku: e.target.value.trim() })
                    }
                  />
                </div>

                {/* Seletor opcional (nome + sku) */}
                <div>
                  <select
                    id={selectId}
                    className="w-full h-10 border rounded-md px-2 bg-background"
                    value={it.sku}
                    onChange={(e) => atualizarItem(it.id, { sku: e.target.value })}
                    aria-label="Selecionar produto"
                  >
                    <option value="">Selecione…</option>
                    {produtos.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.nome} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantidade */}
                <div className="text-center">
                  <label htmlFor={qtyId} className="sr-only">
                    Quantidade
                  </label>
                  <input
                    id={qtyId}
                    type="number"
                    min={1}
                    className="w-full h-10 border rounded-md px-2 bg-background text-center"
                    value={it.qty}
                    onChange={(e) =>
                      atualizarItem(it.id, { qty: Math.max(0, Number(e.target.value) || 0) })
                    }
                    aria-invalid={it.qty <= 0}
                  />
                </div>

                {/* Bônus R$ */}
                <div className="text-center">
                  <input
                    id={bonusReaisId}
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full h-10 border rounded-md px-2 bg-background text-center"
                    value={it.bonusReais}
                    onChange={(e) =>
                      atualizarItem(it.id, {
                        bonusReais: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    placeholder="0,00"
                    aria-invalid={it.bonusReais < 0}
                  />
                </div>

                {/* Pacotes */}
                <div className="text-center">
                  <input
                    id={bonusPacId}
                    type="number"
                    min={0}
                    step={1}
                    className="w-full h-10 border rounded-md px-2 bg-background text-center"
                    value={it.bonusPacotes}
                    onChange={(e) =>
                      atualizarItem(it.id, {
                        bonusPacotes: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    placeholder="0"
                    aria-invalid={it.bonusPacotes < 0}
                  />
                </div>

                {/* Remover */}
                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => rmLinha(it.id)}
                    aria-label="Remover item"
                    title="Remover item"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={addLinha}>
            + Item
          </Button>
          <Button type="button" onClick={simular} disabled={carregando}>
            Simular (Regras)
          </Button>
        </div>

        {/* Totais base */}
        <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-md bg-muted">
          <div><b>Receita (itens):</b> {moeda(totaisBase.receita)}</div>
          <div><b>COGS (itens):</b> {moeda(totaisBase.cogs)}</div>
        </div>

        {/* Resultado das Regras */}
        {sim && (
          <section
            className="rounded-lg p-4 space-y-3 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50"
            aria-live="polite"
          >
            <h2 className="text-lg font-semibold">Resultado (Regras da Tabela)</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              <div><b>Receita:</b> {moeda(sim.receita)}</div>
              <div><b>COGS:</b> {moeda(sim.cogs)}</div>
              <div><b>Margem sem bônus:</b> {pct(sim.margem_sem_bonus)}</div>
              <div><b>Bônus em dinheiro (regra):</b> {moeda(sim.bonus_dinheiro)}</div>
              <div><b>Margem com dinheiro (regra):</b> {pct(sim.margem_com_dinheiro)}</div>
              <div><b>Custo dos pacotes (regra):</b> {moeda(sim.custo_pacotes)}</div>
              <div><b>Margem com pacotes (regra):</b> {pct(sim.margem_com_pacotes)}</div>
            </div>
          </section>
        )}

        {/* Bonificações manuais */}
        <section className="rounded-lg p-4 space-y-3 bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900/50" aria-live="polite">
          <h2 className="text-lg font-semibold">Bonificações Manuais (por item)</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <div><b>Receita:</b> {moeda(totaisBase.receita)}</div>
            <div><b>COGS:</b> {moeda(totaisBase.cogs)}</div>
            <div><b>Total bônus em dinheiro (manual):</b> {moeda(bonusManuais.bonusDinheiro)}</div>
            <div><b>Custo dos pacotes (manual):</b> {moeda(bonusManuais.custoPacotes)}</div>
            <div className="sm:col-span-2"><b>Margem com bonificações manuais:</b> {pct(bonusManuais.margemComManuais)}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
