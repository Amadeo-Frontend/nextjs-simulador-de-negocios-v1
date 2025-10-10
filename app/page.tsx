'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ModeToggle } from './components/mode-toggle';

// ===== Tipos =====
type Product = { sku: string; nome: string; preco_venda: number; custo: number };
type OrderItem = { id: string; sku: string; qty: number };

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

// util para moeda e %
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number) => (v * 100).toFixed(2) + '%';

export default function Home() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const idSeq = useRef(0);
  const [itens, setItens] = useState<OrderItem[]>(() => [{ id: 'i0', sku: '', qty: 1 }]);
  useEffect(() => {
    idSeq.current = 1; // evita ids diferentes entre SSR/cliente
  }, []);

  const [sim, setSim] = useState<Simulacao | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/products', { cache: 'no-store' });
        if (!r.ok) throw new Error('Falha ao carregar produtos.');
        const data: Product[] = await r.json();
        setProdutos(data);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar produtos.');
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const totalPedido = useMemo(() => {
    const map = new Map(produtos.map((p) => [p.sku, p]));
    return itens.reduce(
      (acc, it) => {
        const p = map.get(it.sku);
        if (!p) return acc;
        acc.receita += p.preco_venda * it.qty;
        acc.custo += p.custo * it.qty;
        return acc;
      },
      { receita: 0, custo: 0 }
    );
  }, [itens, produtos]);

  // ===== Ações =====
  const novoId = () => `i${idSeq.current++}`;

  const addLinha = () => setItens((prev) => [...prev, { id: novoId(), sku: '', qty: 1 }]);

  const rmLinha = (id: string) => setItens((prev) => prev.filter((i) => i.id !== id));

  const atualizarItem = (id: string, patch: Partial<Omit<OrderItem, 'id'>>) =>
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const simular = async () => {
    setErro('');
    setSim(null);

    const payload = { itens: itens.filter((i) => i.sku && i.qty > 0).map(({ sku, qty }) => ({ sku, qty })) };
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
      if (!r.ok) throw new Error('Falha na simulação.');
      const data: Simulacao = await r.json();
      setSim(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido ao simular.');
    }
  };

  if (carregando) return <p className="text-center mt-10">Carregando produtos…</p>;

  return (
    <main className="min-h-screen p-6 bg-gray-100 text-gray-900 dark:bg-slate-900 dark:text-slate-100 transition-colors">
      <div
        className="mx-auto max-w-3xl rounded-xl shadow p-6 space-y-6
                   bg-white border border-slate-200
                   dark:bg-slate-800 dark:border-slate-700"
      >
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Simulador de Pedido & Bonificação</h1>
            <p className="text-gray-600 dark:text-slate-300">
              Monte o pedido e calcule bônus (R$ e pacotes) e a margem final.
            </p>
          </div>
          <ModeToggle />
        </header>

        {/* Linhas do pedido */}
        <div className="space-y-4">
          {itens.map((it) => {
            const selectId = `sku-${it.id}`;
            const qtyId = `qty-${it.id}`;
            return (
              <div key={it.id} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-8">
                  <label htmlFor={selectId} className="block text-sm font-medium">
                    Produto
                  </label>
                  <select
                    id={selectId}
                    name="produto"
                    className="mt-1 w-full border rounded-md p-2
                               bg-white text-gray-900 border-slate-300
                               dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
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

                <div className="col-span-3">
                  <label htmlFor={qtyId} className="block text-sm font-medium">
                    Quantidade
                  </label>
                  <input
                    id={qtyId}
                    name="quantidade"
                    type="number"
                    min={1}
                    className="mt-1 w-full border rounded-md p-2
                               bg-white text-gray-900 border-slate-300
                               dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
                    value={it.qty}
                    onChange={(e) => atualizarItem(it.id, { qty: Number(e.target.value) || 0 })}
                  />
                </div>

                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => rmLinha(it.id)}
                    className="w-full border rounded-md p-2
                               bg-white hover:bg-slate-50 border-slate-300
                               dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-700"
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
              className="px-3 py-2 rounded-md bg-slate-100 border border-slate-300
                         hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600"
            >
              + Item
            </button>
            <button
              type="button"
              onClick={simular}
              className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Simular
            </button>
          </div>
        </div>

        {/* Totais parciais */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-md bg-slate-50 dark:bg-slate-700/40">
          <div>
            <b>Receita (itens):</b> {moeda(totalPedido.receita)}
          </div>
          <div>
            <b>COGS (itens):</b> {moeda(totalPedido.custo)}
          </div>
        </div>

        {erro && <p className="text-red-600 dark:text-rose-400">{erro}</p>}

        {/* Resultado */}
        {sim && (
          <section
            className="rounded-lg p-4 space-y-3
                       bg-green-50 border border-green-200
                       dark:bg-emerald-900/30 dark:border-emerald-800/60"
            aria-live="polite"
          >
            <h2 className="text-lg font-semibold">Resultado da Simulação</h2>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <b>Receita:</b> {moeda(sim.receita)}
              </div>
              <div>
                <b>COGS:</b> {moeda(sim.cogs)}
              </div>
              <div>
                <b>Margem sem bônus:</b> {pct(sim.margem_sem_bonus)}
              </div>
            </div>

            <hr className="border-green-200 dark:border-emerald-800/60" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <b>Bônus em dinheiro:</b> {moeda(sim.bonus_dinheiro)}
              </div>
              <div>
                <b>Margem com dinheiro:</b> {pct(sim.margem_com_dinheiro)}
              </div>
            </div>

            <hr className="border-green-200 dark:border-emerald-800/60" />

            <div className="space-y-1">
              <b>Pacotes grátis:</b>{' '}
              {sim.pacotes_gratis.length ? (
                <ul className="list-disc pl-6">
                  {sim.pacotes_gratis.map((p) => (
                    <li key={p.sku}>
                      {p.qty}× {p.sku} (custo {moeda(p.custo_total)})
                    </li>
                  ))}
                </ul>
              ) : (
                <span>nenhum</span>
              )}
              <div>
                <b>Custo dos pacotes:</b> {moeda(sim.custo_pacotes)}
              </div>
              <div>
                <b>Margem com pacotes:</b> {pct(sim.margem_com_pacotes)}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
