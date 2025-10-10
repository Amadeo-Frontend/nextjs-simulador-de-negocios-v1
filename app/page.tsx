// frontend/app/page.tsx
'use client';

import { useState, useEffect } from 'react';

// Tipos para os dados (boa prática)
interface RegraBonificacao {
  nivel: string;
  faixaInicio: number;
  faixaFim: number;
  bonificacaoPercentual: number;
  pacotesRacao: number;
}

interface ResultadoSimulacao {
  nivel: string;
  valorBonificacao: number;
  pacotesRacao: number;
}

export default function Home() {
  const [valorPedido, setValorPedido] = useState<string>('');
  const [regras, setRegras] = useState<RegraBonificacao[]>([]);
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null);
  const [erro, setErro] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    const fetchRegras = async () => {
      try {
        // A MUDANÇA ESTÁ AQUI: Usamos a variável de ambiente
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          throw new Error('URL da API não configurada.');
        }
        
        const response = await fetch(`${apiUrl}/regras`);
        if (!response.ok) {
          throw new Error('Falha ao carregar as regras da API.');
        }
        const data = await response.json();
        setRegras(data);
      } catch (err) {
        if (err instanceof Error) {
          setErro(err.message);
        } else {
          setErro('Erro desconhecido ao carregar as regras.');
        }
      } finally {
        setCarregando(false);
      }
    };

    fetchRegras();
  }, []);

  const handleSimular = () => {
    setErro('');
    setResultado(null);

    const valor = parseFloat(valorPedido);

    if (isNaN(valor) || valor <= 0) {
      setErro('Por favor, digite um valor de pedido válido.');
      return;
    }

    const regraEncontrada = regras.find(
      (regra) => valor >= regra.faixaInicio && valor <= regra.faixaFim
    );

    if (regraEncontrada) {
      const valorBonificacao = (valor * regraEncontrada.bonificacaoPercentual) / 100;
      setResultado({
        nivel: regraEncontrada.nivel,
        valorBonificacao: valorBonificacao,
        pacotesRacao: regraEncontrada.pacotesRacao,
      });
    } else {
      setErro('Nenhuma regra de bonificação encontrada para este valor.');
    }
  };

  if (carregando) {
    return <p className="text-center mt-10">Carregando regras da API...</p>;
  }

  if (erro && !resultado) {
    return <p className="text-center mt-10 text-red-500">Erro: {erro}</p>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Simulador de Bonificação
        </h1>
        <p className="text-center text-gray-600">
          Digite o valor total do pedido para simular a bonificação.
        </p>

        <div>
          <label htmlFor="valorPedido" className="block text-sm font-medium text-gray-700">
            Valor do Pedido (R$)
          </label>
          <input
            type="number"
            id="valorPedido"
            value={valorPedido}
            onChange={(e) => setValorPedido(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Ex: 7500"
          />
        </div>

        <button
          onClick={handleSimular}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Simular
        </button>

        {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}

        {resultado && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800">Resultado da Simulação</h2>
            <div className="mt-2 space-y-1 text-green-700">
              <p><strong>Nível Alcançado:</strong> {resultado.nivel}</p>
              <p><strong>Bonificação em Dinheiro:</strong> R$ {resultado.valorBonificacao.toFixed(2)}</p>
              <p><strong>Pacotes de Ração (20kg):</strong> {resultado.pacotesRacao}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
