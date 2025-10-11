'use client';

import { Suspense } from 'react';
import LoginInner from './login-inner';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Carregando…</div>}>
      <LoginInner />
    </Suspense>
  );
}
