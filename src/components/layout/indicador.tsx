import { cn } from "@/lib/utils";

export function GrelhaIndicadores({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</ul>;
}

export function Indicador({
  rotulo,
  valor,
  detalhe,
  className,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("superficie flex flex-col gap-1 p-4", className)}>
      <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{valor}</p>
      {detalhe ? <p className="text-xs text-muted-foreground">{detalhe}</p> : null}
    </li>
  );
}
