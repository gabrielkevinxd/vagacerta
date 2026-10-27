import Link from "next/link";
import { Lock } from "lucide-react";
import { EstadoVazio } from "@/components/estado-vazio";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Button } from "@/components/ui/button";

export function SemAcesso({
  tituloPagina,
  titulo,
  detalhe,
  accao,
}: {
  tituloPagina: string;
  titulo: string;
  detalhe: string;
  accao: string;
}) {
  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo={tituloPagina} />
      <EstadoVazio
        titulo={titulo}
        detalhe={detalhe}
        icone={<Lock className="size-5 text-muted-foreground" strokeWidth={1.75} />}
        accao={
          <Button asChild size="sm" variant="outline">
            <Link href="/">{accao}</Link>
          </Button>
        }
      />
    </div>
  );
}
