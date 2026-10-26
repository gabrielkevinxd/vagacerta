import Link from "next/link";
import { SeletorIdioma } from "@/components/idioma/seletor";

export function Navegacao({
  itens,
  caminho,
  menu,
  seccoes,
}: {
  itens: { href: string; rotulo: string }[];
  caminho: string;
  menu: string;
  seccoes: string;
}) {
  const lista = (classe: string) => (
    <ul className={classe}>
      {itens.map((item) => {
        const ativo = item.href === "/" ? caminho === "/" : caminho === item.href || caminho.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={`block rounded-lg px-3 py-2 text-sm ${ativo ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {item.rotulo}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav aria-label={seccoes} className="border-b border-border bg-card/80">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-2 md:hidden">
        <details className="min-w-0 flex-1">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">{menu}</summary>
          {lista("flex flex-col gap-1 px-4 pb-3")}
        </details>
        <div className="px-4 py-2">
          <SeletorIdioma />
        </div>
      </div>
      {lista("mx-auto hidden max-w-6xl gap-1 px-4 py-2 md:flex md:flex-row")}
    </nav>
  );
}
