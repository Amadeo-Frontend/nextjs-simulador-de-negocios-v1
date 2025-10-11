'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginInner() {
  const router = useRouter();
  const params = useSearchParams(); // agora pode usar com segurança
  const errorFromQuery = params.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(errorFromQuery);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);

    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!r.ok) {
        const body = await r.json().catch(() => ({} as unknown));
        setErr(body?.error ?? 'Credenciais inválidas');
        return;
      }

      // sucesso → volta para a home (ou para onde preferir)
      router.push('/');
      router.refresh();
    } catch (e) {
      setErr('Falha ao conectar ao servidor.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-100 text-gray-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md rounded-xl shadow p-6 space-y-6 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <header>
          <h1 className="text-2xl font-bold">Entrar</h1>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900 border-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
              placeholder="Seu Email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900 border-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
              placeholder="••••••••"
            />
          </div>

          {err && (
            <p className="text-sm text-red-600 dark:text-rose-400" role="alert">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
