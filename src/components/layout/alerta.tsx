import { cn } from "@/lib/utils";

export function Alerta({
  children,
  tom = "info",
  className,
  role = "status",
}: {
  children: React.ReactNode;
  tom?: "info" | "sucesso" | "aviso" | "erro";
  className?: string;
  role?: "status" | "alert";
}) {
  const tons = {
    info: "border-border bg-muted/50 text-foreground",
    sucesso: "border-[color:var(--success)]/25 bg-[color:var(--success)]/8 text-foreground",
    aviso: "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 text-foreground",
    erro: "border-destructive/25 bg-destructive/8 text-destructive",
  } as const;
  return (
    <div role={role} className={cn("superficie px-3.5 py-2.5 text-sm leading-relaxed", tons[tom], className)}>
      {children}
    </div>
  );
}
