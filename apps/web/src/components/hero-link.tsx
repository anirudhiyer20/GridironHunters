import Link from "next/link";

export function HeroLink({
  href,
  children,
  tone = "primary",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "secondary";
}) {
  const className =
    tone === "primary"
      ? "bg-[#f2bf5e] text-[#102117] hover:bg-[#f7cd7c]"
      : "border border-white/14 bg-white/6 text-stone-100 hover:bg-white/10";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-colors ${className}`}
    >
      {children}
    </Link>
  );
}
