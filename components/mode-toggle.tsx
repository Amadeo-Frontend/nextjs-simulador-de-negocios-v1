"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ModeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const current = theme === "system" ? systemTheme : theme;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Tema claro"
        onClick={() => setTheme("light")}
        className={`size-9 inline-flex items-center justify-center rounded-md border transition
          ${current === "light" ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}
      >
        <Sun className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Tema sistema"
        onClick={() => setTheme("system")}
        className={`size-9 inline-flex items-center justify-center rounded-md border transition
          ${theme === "system" ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}
      >
        <span className="text-xs font-medium">SYS</span>
      </button>
      <button
        type="button"
        aria-label="Tema escuro"
        onClick={() => setTheme("dark")}
        className={`size-9 inline-flex items-center justify-center rounded-md border transition
          ${current === "dark" ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}
      >
        <Moon className="size-4" />
      </button>
    </div>
  );
}
