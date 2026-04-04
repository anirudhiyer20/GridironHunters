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
      ? "fantasy-button fantasy-button--gold"
      : "fantasy-button fantasy-button--stone";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
