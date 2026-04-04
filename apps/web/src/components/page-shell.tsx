import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/app", label: "House" },
  { href: "/app/guild", label: "Guild" },
  { href: "/app/dungeon", label: "Dungeon" },
  { href: "/app/arena", label: "Arena" },
  { href: "/app/admin", label: "Admin" },
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
    <main className="app-shell text-[#f6ead0]">
      <div className="app-shell__noise" />
      <div className="app-shell__vignette" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="app-frame relative overflow-hidden rounded-[2.2rem] px-5 py-6 sm:px-8 sm:py-7">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="app-kicker text-[0.68rem] text-[#d9bc83] sm:text-xs">{eyebrow}</p>
              <h1 className="app-title mt-3 text-4xl font-semibold sm:text-5xl lg:text-6xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#efe2c9] sm:text-base">
                {description}
              </p>
            </div>

            <nav className="flex flex-wrap gap-3 text-sm text-[#efe2c9]">
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

        <footer className="mt-10 border-t border-[#9b7c48]/18 pt-6 text-sm text-[#bda783]">
          GridironHunters closed-beta world shell
        </footer>
      </div>
    </main>
  );
}
