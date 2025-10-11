'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const qp = useSearchParams();
  const next = qp.get('next') || '/';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(''); setLoading(true);
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setErro(data?.error || 'Falha no login');
      return;
    }
    router.replace(next);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
      <form onSubmit={onSubmit}
        className="w-full max-w-sm bg-white dark:bg-slate-800 p-6 rounded-xl shadow space-y-4">
        <h1 className="text-xl font-semibold">Entrar</h1>

        <div>
          <label htmlFor="email" className="text-sm">E-mail</label>
          <input id="email" type="email" required value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="mt-1 w-full border rounded p-2 bg-white dark:bg-slate-900" />
        </div>

        <div>
          <label htmlFor="pass" className="text-sm">Senha</label>
          <input id="pass" type="password" required value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="mt-1 w-full border rounded p-2 bg-white dark:bg-slate-900" />
        </div>

        {erro && <p className="text-red-600 dark:text-rose-400 text-sm">{erro}</p>}

        <button disabled={loading}
          className="w-full rounded bg-indigo-600 text-white py-2 hover:bg-indigo-700 disabled:opacity-60">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
