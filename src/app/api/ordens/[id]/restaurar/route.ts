import { ErroHttp } from "@/server/erros";
import { api } from "@/server/http";
import { restaurarCancelamento } from "@/server/servicos";

type Contexto = { params: Promise<{ id: string }> };

export const POST = api<Contexto>(async (ator, _pedido, contexto) => {
  if (ator.papel === "tecnico") {
    throw new ErroHttp(403, "SEM_PERMISSAO", "O técnico não cancela nem repõe ordens.");
  }
  const { id } = await contexto.params;
  return restaurarCancelamento(ator, id);
});
