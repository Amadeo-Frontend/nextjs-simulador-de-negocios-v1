'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // lê estado atual do <html>
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !root.classList.contains('dark');
    root.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
    setIsDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                 bg-white/70 hover:bg-white dark:bg-slate-800/70 dark:hover:bg-slate-800
                 border-slate-300 dark:border-slate-700"
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      <span aria-hidden="true">{isDark ? '🌙' : '☀️'}</span>
      {isDark ? 'Escuro' : 'Claro'}
    </button>
  );
}
