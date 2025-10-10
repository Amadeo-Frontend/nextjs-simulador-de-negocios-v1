'use client';

import { useEffect, useMemo, useState } from 'react';

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
const newId = () => (globalThis.crypto?.randomUUID() ? crypto.randomUUID() : String(Date.now() + Math.random()));

export default function Home() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [itens, setItens] = useState<OrderItem[]>([{ id: newId(), sku: '', qty: 1 }]);
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
    const map = new Map(produtos.map(p => [p.sku, p]));
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
  const addLinha = () => setItens(prev => [...prev, { id: newId(), sku: '', qty: 1 }]);

  const rmLinha = (id: string) => setItens(prev => prev.filter(i => i.id !== id));

  const atualizarItem = (id: string, patch: Partial<Omit<OrderItem, 'id'>>) =>
    setItens(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));

  const simular = async () => {
    setErro('');
    setSim(null);

    const payload = { itens: itens.filter(i => i.sku && i.qty > 0).map(({ sku, qty }) => ({ sku, qty })) };
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
    <main className="min-h-screen p-6 bg-gray-100">
      <div className="mx-auto max-w-3xl bg-white rounded-xl shadow p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Simulador de Pedido & Bonificação</h1>
          <p className="text-gray-600">Monte o pedido e calcule bônus (R$ e pacotes) e a margem final.</p>
        </header>

        {/* Linhas do pedido */}
        <div className="space-y-4">
          {itens.map((it) => {
            const selectId = `sku-${it.id}`;
            const qtyId = `qty-${it.id}`;
            return (
              <div key={it.id} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-8">
                  <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
                    Produto
                  </label>
                  <select
                    id={selectId}
                    name="produto"
                    className="mt-1 w-full border rounded-md p-2"
                    value={it.sku}
                    onChange={(e) => atualizarItem(it.id, { sku: e.target.value })}
                    aria-describedby={`${selectId}-help`}
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
                  <p id={`${selectId}-help`} className="sr-only">
                    Escolha o produto para esta linha do pedido
                  </p>
                </div>

                <div className="col-span-3">
                  <label htmlFor={qtyId} className="block text-sm font-medium text-gray-700">
                    Quantidade
                  </label>
                  <input
                    id={qtyId}
                    name="quantidade"
                    type="number"
                    min={1}
                    className="mt-1 w-full border rounded-md p-2"
                    value={it.qty}
                    onChange={(e) => atualizarItem(it.id, { qty: Number(e.target.value) || 0 })}
                  />
                </div>

                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => rmLinha(it.id)}
                    className="w-full border rounded-md p-2"
                    aria-label="Remover item do pedido"
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
              className="px-3 py-2 rounded-md bg-slate-100 border"
            >
              + Item
            </button>
            <button
              type="button"
              onClick={simular}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white"
            >
              Simular
            </button>
          </div>
        </div>

        {/* Totais parciais do pedido (cliente gosta de ver) */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md">
          <div><b>Receita (itens):</b> {moeda(totalPedido.receita)}</div>
          <div><b>COGS (itens):</b> {moeda(totalPedido.custo)}</div>
        </div>

        {erro && <p className="text-red-600">{erro}</p>}

        {/* Resultado da simulação */}
        {sim && (
          <section className="border rounded-lg p-4 bg-green-50 space-y-3" aria-live="polite">
            <h2 className="text-lg font-semibold text-green-800">Resultado da Simulação</h2>

            <div className="grid grid-cols-2 gap-2 text-green-900">
              <div><b>Receita:</b> {moeda(sim.receita)}</div>
              <div><b>COGS:</b> {moeda(sim.cogs)}</div>
              <div><b>Margem sem bônus:</b> {pct(sim.margem_sem_bonus)}</div>
            </div>

            <hr className="border-green-200" />

            <div className="grid grid-cols-2 gap-2 text-green-900">
              <div><b>Bônus em dinheiro:</b> {moeda(sim.bonus_dinheiro)}</div>
              <div><b>Margem com dinheiro:</b> {pct(sim.margem_com_dinheiro)}</div>
            </div>

            <hr className="border-green-200" />

            <div className="text-green-900 space-y-1">
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
              <div><b>Custo dos pacotes:</b> {moeda(sim.custo_pacotes)}</div>
              <div><b>Margem com pacotes:</b> {pct(sim.margem_com_pacotes)}</div>
            </div>

            {sim.regra_aplicada && (
              <p className="text-sm text-slate-600">
                Regra aplicada: R$ {sim.regra_aplicada.faixa_inicio}–{sim.regra_aplicada.faixa_fim} •
                bônus {sim.regra_aplicada.bonus_percentual}% • {sim.regra_aplicada.pacotes_gratis} pacotes
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
