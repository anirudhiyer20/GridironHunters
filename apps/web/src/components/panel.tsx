export function Panel({
  title,
  description,
  children,
  className,
  titleClassName,
  descriptionClassName,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <section className={`rounded-[1.75rem] border border-white/10 bg-black/20 p-6 ${className ?? ""}`}>
      <h2 className={`text-xl font-semibold text-stone-50 ${titleClassName ?? ""}`}>{title}</h2>
      {description ? (
        <p className={`mt-2 max-w-2xl text-sm leading-6 text-stone-300 ${descriptionClassName ?? ""}`}>
          {description}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
