export function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
      <h2 className="text-xl font-semibold text-stone-50">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
          {description}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
