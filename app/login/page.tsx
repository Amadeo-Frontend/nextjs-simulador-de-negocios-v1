'use client';

import { FormEvent, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/mode-toggle';

export default function LoginPage() {
  const router = useRouter();

  const emailId = useId();
  const passId = useId();

  const [email, setEmail] = useState('admin@sulpet.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        if (r.ok) router.replace('/');
      } catch {}
    })();
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!r.ok) {
        let msg = 'Credenciais inválidas';
        try {
          const data = await r.json();
          if (typeof data?.error === 'string') msg = data.error;
          if (typeof data?.detail === 'string') msg = data.detail;
        } catch {}
        setErro(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success('Login realizado!');
      router.replace('/');
    } catch {
      const msg = 'Falha ao conectar. Tente novamente.';
      setErro(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gray-50 text-slate-900 dark:bg-neutral-900 dark:text-slate-100">
      {/* botão de tema no canto superior direito */}
      <div className="fixed right-4 top-4">
        <ModeToggle />
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-md dark:border-neutral-700 dark:bg-neutral-800"
        aria-busy={loading}
      >
        <h1 className="text-xl font-semibold">Entrar</h1>

        <div className="space-y-1.5">
          <Label htmlFor={emailId}>E-mail</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!erro}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={passId}>Senha</Label>
          <Input
            id={passId}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!erro}
            required
          />
        </div>

        {erro && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {erro}
          </p>
        )}

        <Button type="submit" disabled={loading} aria-busy={loading} className="w-full">
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  );
}
