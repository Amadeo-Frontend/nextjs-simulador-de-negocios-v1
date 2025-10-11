'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'; // shadcn
import { ModeToggle } from './components/mode-toggle';

type Product = { sku: string; nome: string; preco_venda: number; custo: number };
type OrderItem = {
  id: string;
  sku: string;
  qty: number;
  bonusReais: number;
  bonusPacotes: number;
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

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number) => (v * 100).toFixed(2) + '%';

export default function Home() {
  const router = useRouter();

  const [produtos, setProdutos] = useState<Product[]>([]);
  const idSeq = useRef(0);
  const [itens, setItens] = useState<OrderItem[]>(() => [
    { id: 'i0', sku: '', qty: 1, bonusReais: 0, bonusPacotes: 0 },
  ]);
  useEffect(() => { idSeq.current = 1; }, []);

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

  const mapaProdutos = useMemo(() => new Map(produtos.map(p => [p.sku, p])), [produtos]);

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
    const receita = totaisBase.receita;
    const cogs = totaisBase.cogs;
    const margemComManuais =
      receita > 0 ? (receita - cogs - bonusDinheiro - custoPacotes) / receita : 0;
    return { bonusDinheiro, custoPacotes, margemComManuais };
  }, [itens, mapaProdutos, totaisBase]);

  // ===== Ações =====
  const novoId = () => `i${idSeq.current++}`;

  const addLinha = () =>
    setItens(prev => [...prev, { id: novoId(), sku: '', qty: 1, bonusReais: 0, bonusPacotes: 0 }]);

  const rmLinha = (id: string) => setItens(prev => prev.filter(i => i.id !== id));

  const atualizarItem = (id: string, patch: Partial<Omit<OrderItem, 'id'>>) =>
    setItens(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));

  const simular = async () => {
    setErro('');
    setSim(null);
    const payload = {
      itens: itens
        .filter(i => i.sku && i.qty > 0)
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
      if (!r.ok) throw new Error('Falha na simulação.');
      const data: Simulacao = await r.json();
      setSim(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido ao simular.');
    }
  };

  // ===== Logout =====
  const onLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  };

  if (carregando) return <p className="text-center mt-10">Carregando produtos…</p>;

  return (
    <main className="min-h-screen p-6 bg-gray-100 text-gray-900 dark:bg-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-3xl rounded-xl shadow p-6 space-y-6 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Simulador de Pedido & Bonificação</h1>
            <p className="text-gray-600 dark:text-slate-300">
              Defina bonificações por item (R$ e pacotes) e veja a margem geral.
            </p>
          </div>

          {/* Ações (tema + logout) */}
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="outline" onClick={onLogout} aria-label="Sair da aplicação">
              Sair
            </Button>
          </div>
        </header>

        {/* Linhas do pedido */}
        <div className="space-y-4">
          {itens.map(it => {
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
                    className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900 border-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
                    value={it.sku}
                    onChange={e => atualizarItem(it.id, { sku: e.target.value })}
                  >
                    <option value="" disabled>Selecione…</option>
                    {produtos.map(p => (
                      <option key={p.sku} value={p.sku}>
                        {p.nome} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantidade */}
                <div className="col-span-2">
                  <label htmlFor={qtyId} className="block text-sm font-medium">Qtd</label>
                  <input
                    id={qtyId}
                    type="number"
                    min={1}
                    className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900 border-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
                    value={it.qty}
                    onChange={e => atualizarItem(it.id, { qty: Number(e.target.value) || 0 })}
                  />
                </div>

                {/* Bônus R$ */}
                <div className="col-span-2">
                  <label htmlFor={bonusReaisId} className="block text-sm font-medium">Bônus (R$)</label>
                  <input
                    id={bonusReaisId}
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900 border-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
                    value={it.bonusReais}
                    onChange={e => atualizarItem(it.id, { bonusReais: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="0,00"
                  />
                </div>

                {/* Pacotes grátis */}
                <div className="col-span-2">
                  <label htmlFor={bonusPacId} className="block text-sm font-medium">Pacotes grátis</label>
                  <input
                    id={bonusPacId}
                    type="number"
                    min={0}
                    step="1"
                    className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900 border-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
                    value={it.bonusPacotes}
                    onChange={e => atualizarItem(it.id, { bonusPacotes: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="0"
                  />
                </div>

                {/* Remover */}
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => rmLinha(it.id)}
                    className="w-full border rounded-md p-2 bg-white hover:bg-slate-50 border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-700"
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
              className="px-3 py-2 rounded-md bg-slate-100 border border-slate-300 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600"
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
        <div className="grid grid-cols-2 gap-4 p-4 rounded-md bg-slate-50 dark:bg-slate-700/40">
          <div><b>Receita (itens):</b> {moeda(totaisBase.receita)}</div>
          <div><b>COGS (itens):</b> {moeda(totaisBase.cogs)}</div>
        </div>

        {/* Resultado das Regras (backend) */}
        {sim && (
          <section className="rounded-lg p-4 space-y-3 bg-blue-50 border border-blue-200 dark:bg-sky-900/30 dark:border-sky-800/60" aria-live="polite">
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

        {/* Bonificações manuais (por item) */}
        <section className="rounded-lg p-4 space-y-3 bg-green-50 border border-green-200 dark:bg-emerald-900/30 dark:border-emerald-800/60" aria-live="polite">
          <h2 className="text-lg font-semibold">Bonificações Manuais (por item)</h2>
          <div className="grid grid-cols-2 gap-2">
            <div><b>Receita:</b> {moeda(totaisBase.receita)}</div>
            <div><b>COGS:</b> {moeda(totaisBase.cogs)}</div>
            <div><b>Total bônus em dinheiro (manual):</b> {moeda(bonusManuais.bonusDinheiro)}</div>
            <div><b>Custo dos pacotes (manual):</b> {moeda(bonusManuais.custoPacotes)}</div>
            <div className="col-span-2"><b>Margem com bonificações manuais:</b> {pct(bonusManuais.margemComManuais)}</div>
          </div>
        </section>

        {erro && <p className="text-red-600 dark:text-rose-400">{erro}</p>}
      </div>
    </main>
  );
}
