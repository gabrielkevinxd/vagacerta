import { api } from "@/server/http";
import { listarOrdens } from "@/server/servicos";

export const GET = api(async (ator, pedido) => {
  const url = new URL(pedido.url);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const bruto = Number(url.searchParams.get("limite") ?? (q ? "8" : "5"));
  const limite = Number.isFinite(bruto) ? Math.min(Math.max(Math.floor(bruto), 1), 20) : q ? 8 : 5;
  const lista = listarOrdens(ator, { q });
  const ordenadas = q
    ? lista
    : [...lista].sort(
        (a, b) => b.data.localeCompare(a.data) || b.referencia.localeCompare(a.referencia),
      );
  return ordenadas.slice(0, limite).map((ordem) => ({
    id: ordem.id,
    referencia: ordem.referencia,
    clienteNome: ordem.clienteNome,
    operadorId: ordem.operadorId,
  }));
});
