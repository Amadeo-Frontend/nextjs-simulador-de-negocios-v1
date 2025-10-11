'use client';

import { FormEvent, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  // ids estáveis para acessibilidade
  const emailId = useId();
  const passId = useId();

  // estado do formulário
  const [email, setEmail] = useState('admin@sulpet.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');

  // Se já estiver autenticado, manda para a home
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        if (r.ok) router.replace('/');
      } catch {
        /* ignora: sem sessão */
      }
    })();
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // evita recarregar a página
    setErro('');
    setLoading(true);

    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!r.ok) {
        // tenta extrair mensagem do backend
        let msg = 'Credenciais inválidas';
        try {
          const data = await r.json();
          if (typeof data?.error === 'string') msg = data.error;
          if (typeof data?.detail === 'string') msg = data.detail;
        } catch {
          /* sem corpo json */
        }
        setErro(msg);
        setLoading(false);
        return;
      }

      // sucesso -> vai para a home
      router.replace('/');
    } catch (err) {
      setErro('Falha ao conectar. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow"
        aria-busy={loading}
      >
        <h1 className="text-xl font-semibold">Entrar</h1>

        <div>
          <label htmlFor={emailId} className="block text-sm font-medium">
            E-mail
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Digite seu email"
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!erro}
            required
          />
        </div>

        <div>
          <label htmlFor={passId} className="block text-sm font-medium">
            Senha
          </label>
          <input
            id={passId}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="mt-1 w-full rounded-md border border-slate-300 p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!erro}
            required
          />
        </div>

        {erro && (
          <p role="alert" className="text-sm text-red-600">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full rounded-md bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}