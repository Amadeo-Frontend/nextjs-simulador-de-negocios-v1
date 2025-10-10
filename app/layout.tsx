import type { Metadata } from 'next';
import { ThemeProvider } from './components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Simulador',
  description: 'Pedidos, bônus e margem',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-100 text-gray-900 dark:bg-slate-900 dark:text-slate-100 antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
