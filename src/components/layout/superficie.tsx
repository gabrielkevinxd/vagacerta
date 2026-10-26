import { cn } from "@/lib/utils";

export function Superficie({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("superficie", className)} {...props} />;
}

export function Seccao({
  titulo,
  descricao,
  accoes,
  children,
  className,
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  accoes?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("entrada-pagina entrada-atraso-1 space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{titulo}</h2>
          {descricao ? <p className="max-w-3xl text-sm text-muted-foreground">{descricao}</p> : null}
        </div>
        {accoes ? <div className="flex flex-wrap items-center gap-2">{accoes}</div> : null}
      </div>
      {children}
    </section>
  );
}
