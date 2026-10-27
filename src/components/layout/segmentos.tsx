import Link from "next/link";
import { cn } from "@/lib/utils";

/** Segmented control: outer height matches design-system button default (`h-8`). */
export function Segmentos({ children, className, etiqueta }: { children: React.ReactNode; className?: string; etiqueta?: string }) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn(
        "inline-flex h-8 items-stretch gap-0.5 rounded-md border border-border bg-muted/40 p-0.5",
        className,
      )}
    >
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
        "inline-flex h-full items-center rounded-[calc(var(--radius-md)-2px)] px-2.5 text-[13px]/5 font-medium transition-colors",
        ativo ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
