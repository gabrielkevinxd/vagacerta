import { cn } from "@/lib/utils";

export function CabecalhoPagina({
  titulo,
  descricao,
  accoes,
  className,
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  accoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-h-11 flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{titulo}</h1>
        {descricao ? <div className="max-w-3xl text-[13px]/5 text-muted-foreground">{descricao}</div> : null}
      </div>
      {accoes ? <div className="flex flex-wrap items-center gap-2">{accoes}</div> : null}
    </header>
  );
}
