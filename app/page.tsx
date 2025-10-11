'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/* ===== Tipos ===== */
type Product = { sku: string; nome: string; preco_venda: number; custo: number };
type OrderItem = {
  id: string;
  sku: string;
  qty: number;
  bonusReais: number;     // bônus manual em R$ por item
  bonusPacotes: number;   // pacotes grátis manuais por item
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

/* ===== Helpers ===== */
const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number) => (v * 100).toFixed(2) + '%';

/* ===== Página ===== */
export default function Home() {
  const router = useRouter();

  const [produtos, setProdutos] = useState<Product[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const idSeq = useRef(0);
  const [itens, setItens] = useState<OrderItem[]>([
    { id: 'i0', sku: '', qty: 1, bonusReais: 0, bonusPacotes: 0 },
  ]);
  useEffect(() => {
    idSeq.current = 1;
  }, []);

  const [sim, setSim] = useState<Simulacao | null>(null);

  /* ===== Guard: checar sessão e carregar produtos ===== */
  useEffect(() => {
    let stopped = false;

    (async () => {
      setErro('');

      // 1) checa sessão
      try {
        const me = await fetch('/api/me', { cache: 'no-store' });
        if (!me.ok) {
          console.warn('/api/me falhou com status', me.status);
          if (!stopped) setCarregando(false);       // <-- evita "carregando" infinito
          router.replace('/login');
          return;
        }
      } catch (e) {
        console.error('Erro chamando /api/me:', e);
        if (!stopped) setCarregando(false);         // <-- idem
        router.replace('/login');
        return;
      }

      // 2) carrega produtos
      try {
        const r = await fetch('/api/products', { cache: 'no-store' });
        if (!r.ok) {
          const body: any = await r.json().catch(() => ({}));
          throw new Error(body?.error || 'Falha ao carregar produtos.');
        }
        const data: Product[] = await r.json();
        if (!stopped) setProdutos(data);
      } catch (e) {
        if (!stopped) setErro(e instanceof Error ? e.message : 'Falha ao carregar produtos.');
      } finally {
        if (!stopped) setCarregando(false);
      }
    })();

    return () => {
      stopped = true;
    };
  }, [router]);

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
    setErro('');
    setSim(null);

    const payload = {
      itens: itens
        .filter((i) => i.sku && i.qty > 0)
        .map(({ sku, qty }) => ({ sku, qty })),
    };
    if (!payload.itens.length) {
      setErro('Adicione ao menos um item com SKU e quantidade.');
      return;
    }

    try {
      const r = await fetch('/api/simular', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        if (r.status === 401) {
          router.replace('/login');
          return;
        }
        const body: any = await r.json().catch(() => ({}));
        throw new Error(body?.error || 'Falha na simulação.');
      }
      const data: Simulacao = await r.json();
      setSim(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido ao simular.');
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  };

  /* ===== Render ===== */
  if (carregando) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <p>Carregando…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-4xl rounded-xl shadow p-6 space-y-6 bg-white">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Simulador de Pedido & Bonificação</h1>
            <p className="text-gray-600">
              Defina bonificações por item (R$ e pacotes) e veja a margem geral.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="px-3 py-2 rounded-md border border-slate-300 hover:bg-slate-50"
            title="Sair"
          >
            Sair
          </button>
        </header>

        {/* Linhas do pedido */}
        <div className="space-y-4">
          {itens.map((it) => {
            const selectId = `sku-${it.id}`;
            const qtyId = `qty-${it.id}`;
            const bonusReaisId = `bonusR-${it.id}`;
            const bonusPacId = `bonusP-${it.id}`;

            return (
              <div key={it.id} className="grid grid-cols-12 gap-3 items-end">
                {/* Produto */}
                <div className="col-span-5">
                  <label htmlFor={selectId} className="block text-sm font-medium">
                    Produto
                  </label>
                  <select
                    id={selectId}
                    className="mt-1 w-full border rounded-md p-2 bg-white"
                    value={it.sku}
                    onChange={(e) => atualizarItem(it.id, { sku: e.target.value })}
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {produtos.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.nome} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantidade */}
                <div className="col-span-2">
                  <label htmlFor={qtyId} className="block text-sm font-medium">
                    Qtd
                  </label>
                  <input
                    id={qtyId}
                    type="number"
                    min={1}
                    className="mt-1 w-full border rounded-md p-2 bg-white"
                    value={it.qty}
                    onChange={(e) =>
                      atualizarItem(it.id, { qty: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </div>

                {/* Bônus R$ */}
                <div className="col-span-2">
                  <label htmlFor={bonusReaisId} className="block text-sm font-medium">
                    Bônus (R$)
                  </label>
                  <input
                    id={bonusReaisId}
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full border rounded-md p-2 bg-white"
                    value={it.bonusReais}
                    onChange={(e) =>
                      atualizarItem(it.id, {
                        bonusReais: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    placeholder="0,00"
                  />
                </div>

                {/* Pacotes grátis */}
                <div className="col-span-2">
                  <label htmlFor={bonusPacId} className="block text-sm font-medium">
                    Pacotes grátis
                  </label>
                  <input
                    id={bonusPacId}
                    type="number"
                    min={0}
                    step="1"
                    className="mt-1 w-full border rounded-md p-2 bg-white"
                    value={it.bonusPacotes}
                    onChange={(e) =>
                      atualizarItem(it.id, {
                        bonusPacotes: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    placeholder="0"
                  />
                </div>

                {/* Remover */}
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => rmLinha(it.id)}
                    className="w-full border rounded-md p-2 bg-white hover:bg-slate-50"
                    aria-label="Remover item"
                    title="Remover item"
                  >
                    −
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={addLinha}
              className="px-3 py-2 rounded-md bg-slate-100 border border-slate-300 hover:bg-slate-200"
            >
              + Item
            </button>
            <button
              type="button"
              onClick={simular}
              className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Simular (Regras)
            </button>
          </div>
        </div>

        {/* Totais base */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-md bg-slate-50">
          <div>
            <b>Receita (itens):</b> {moeda(totaisBase.receita)}
          </div>
          <div>
            <b>COGS (itens):</b> {moeda(totaisBase.cogs)}
          </div>
        </div>

        {/* Resultado das Regras */}
        {sim && (
          <section className="rounded-lg p-4 space-y-3 bg-blue-50 border border-blue-200" aria-live="polite">
            <h2 className="text-lg font-semibold">Resultado (Regras da Tabela)</h2>
            <div className="grid grid-cols-2 gap-2">
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

        {/* Bonificações manuais (cliente) */}
        <section className="rounded-lg p-4 space-y-3 bg-green-50 border border-green-200" aria-live="polite">
          <h2 className="text-lg font-semibold">Bonificações Manuais (por item)</h2>
          <div className="grid grid-cols-2 gap-2">
            <div><b>Receita:</b> {moeda(totaisBase.receita)}</div>
            <div><b>COGS:</b> {moeda(totaisBase.cogs)}</div>
            <div><b>Total bônus em dinheiro (manual):</b> {moeda(bonusManuais.bonusDinheiro)}</div>
            <div><b>Custo dos pacotes (manual):</b> {moeda(bonusManuais.custoPacotes)}</div>
            <div className="col-span-2">
              <b>Margem com bonificações manuais:</b> {pct(bonusManuais.margemComManuais)}
            </div>
          </div>
        </section>

        {erro && <p className="text-red-600">{erro}</p>}
      </div>
    </main>
  );
}
