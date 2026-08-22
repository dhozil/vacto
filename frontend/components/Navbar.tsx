"use client";

import { Logo } from "./Logo";
import { AccountPanel } from "./AccountPanel";
import { Badge } from "./ui/badge";

export function Navbar() {
  return (
    <header className="brand-navbar sticky top-0 z-50">
      <nav className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Logo />
          <div className="leading-tight min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground truncate">
              Vacto
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              Private two-party agreements · built on GenLayer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Badge variant="success" className="hidden md:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            </span>
            GenLayer
          </Badge>
          <AccountPanel />
        </div>
      </nav>
    </header>
  );
}