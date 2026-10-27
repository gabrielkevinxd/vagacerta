import { OctagonX, TriangleAlert } from "lucide-react";
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
  const Icone = tom === "erro" ? OctagonX : tom === "aviso" ? TriangleAlert : null;
  return (
    <div role={role} className={cn("superficie px-3.5 py-2.5 text-[13px]/5 leading-relaxed", tons[tom], className)}>
      {Icone ? (
        <div className="flex items-start gap-2">
          <Icone className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
