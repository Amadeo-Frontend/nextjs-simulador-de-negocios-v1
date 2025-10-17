import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import { ModeToggle } from "@/components/mode-toggle"; // <-- importe o client component

export const metadata: Metadata = {
  title: "Simulador de Pedido & Bonificação",
  description: "Simulador com SKU, bonificações e modo escuro.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="w-full border-b bg-card">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
              <h1 className="font-semibold">Sulpet • Simulador</h1>
              <ModeToggle />
            </div>
          </div>

          {children}

          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
