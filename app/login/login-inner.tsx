'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
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
        const body = await r.json().catch(() => ({}));
        setErr(body?.error ?? 'Credenciais inválidas');
        return;
      }
      // sucesso
      router.replace('/');
      router.refresh();
    } catch {
      setErr('Falha ao conectar.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-xl border p-6 bg-white">
        <h1 className="text-xl font-semibold">Entrar</h1>

        <div>
          <label className="block text-sm font-medium" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full border rounded-md p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full border rounded-md p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-indigo-600 text-white py-2 disabled:opacity-60"
        >
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
