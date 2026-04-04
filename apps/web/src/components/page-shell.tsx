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
    <main className="app-shell text-stone-50">
      <div className="app-shell__grid" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="app-frame relative overflow-hidden rounded-[2rem] px-5 py-6 sm:px-8 sm:py-7">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="app-kicker text-[0.68rem] text-[#87a9ff] sm:text-xs">{eyebrow}</p>
              <h1 className="app-title mt-3 text-4xl font-semibold sm:text-5xl lg:text-6xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base">
                {description}
              </p>
            </div>

            <nav className="flex flex-wrap gap-3 text-sm text-stone-300">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="app-nav-pill"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="mt-8 flex-1">{children}</div>

        <footer className="mt-10 border-t border-[#6e95ff]/16 pt-6 text-sm text-stone-400">
          {appName} foundation build
        </footer>
      </div>
    </main>
  );
}
