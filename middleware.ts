// frontend/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Rotas que NÃO exigem estar logado
const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
  "/api/health",
  "/favicon.ico",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // libera assets/Next estáticos
  if (pathname.startsWith("/_next") || pathname.startsWith("/assets")) {
    return NextResponse.next();
  }

  // libera as rotas públicas
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // checa cookie da sessão
  const token = req.cookies.get("session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = ""; // opcional: limpa query
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Protege "tudo", exceto o que tratamos acima
export const config = {
  matcher: ["/((?!_next|assets|favicon.ico).*)"],
};
