'use client';

import { Suspense } from 'react';
import LoginInner from './login-inner';

/**
 * Força renderização dinâmica (sem SSG) para evitar
 * erro de prerender com hooks de navegação.
 */
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
