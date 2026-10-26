import Link from "next/link";
import { cn } from "@/lib/utils";

export function ListaDados({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("superficie divide-y divide-border/80 overflow-hidden", className)}>{children}</ul>;
}

export function ItemListaDados({
  href,
  children,
  className,
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = cn(
    "flex flex-wrap items-center gap-2 px-4 py-3 text-sm transition-colors duration-150",
    href ? "hover:bg-muted/70" : "",
    className,
  );
  if (href) {
    return (
      <li>
        <Link href={href} className={classes}>
          {children}
        </Link>
      </li>
    );
  }
  return <li className={classes}>{children}</li>;
}
