import Link from "next/link";

import { appName } from "@/lib/mock-data";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/auth/login", label: "Login" },
  { href: "/auth/signup", label: "Sign Up" },
  { href: "/app", label: "App" },
  { href: "/app/leagues", label: "Leagues" },
];

export function PageShell({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1c4838_0%,#102117_42%,#09120e_100%)] text-stone-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-8">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#f2bf5e]">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
              {description}
            </p>
          </div>

          <nav className="flex flex-wrap gap-3 text-sm text-stone-300">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2 transition-colors hover:bg-white/8"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="mt-8 flex-1">{children}</div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-stone-400">
          {appName} Sprint 1 foundation build
        </footer>
      </div>
    </main>
  );
}
