import Link from "next/link";
import { cn } from "@/lib/utils";

export function Segmentos({ children, className, etiqueta }: { children: React.ReactNode; className?: string; etiqueta?: string }) {
  return (
    <div role="group" aria-label={etiqueta} className={cn("inline-flex flex-wrap gap-1 rounded-md border border-border bg-muted/40 p-1", className)}>
      {children}
    </div>
  );
}

export function SegmentoLigacao({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "inline-flex h-8 items-center rounded px-3 text-[13px]/5 font-medium transition-colors",
        ativo ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
