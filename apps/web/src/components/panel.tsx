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
    <section className={`fantasy-panel fantasy-panel--stone rounded-[1.8rem] p-6 ${className ?? ""}`}>
      <h2 className={`fantasy-title text-2xl text-[#fff4d8] ${titleClassName ?? ""}`}>{title}</h2>
      {description ? (
        <p className={`mt-2 max-w-2xl text-sm leading-7 text-[#efe2c9] ${descriptionClassName ?? ""}`}>
          {description}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
