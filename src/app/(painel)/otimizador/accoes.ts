"use server";

import { redirect } from "next/navigation";
import type { PedidoRealocacao } from "@/lib/rules/reencaixe";
import { ErroHttp } from "@/server/erros";
import { exigirAtorPagina } from "@/server/sessao";
import { confirmarPlano } from "@/server/servicos";

export async function confirmarPlanoAcao(formulario: FormData) {
  const ator = await exigirAtorPagina();
  let pedido: PedidoRealocacao;
  try {
    pedido = JSON.parse(String(formulario.get("pedido") ?? "{}")) as PedidoRealocacao;
  } catch {
    redirect("/otimizador?erro=" + encodeURIComponent("O plano enviado não é válido."));
  }
  const selo = String(formulario.get("selo") ?? "");
  const data = pedido.data ?? "";
  try {
    await confirmarPlano(ator, pedido, selo);
  } catch (erro) {
    if (erro instanceof ErroHttp) {
      redirect(`/otimizador?data=${encodeURIComponent(data)}&erro=${encodeURIComponent(erro.message)}`);
    }
    throw erro;
  }
  redirect(`/otimizador?data=${encodeURIComponent(data)}&confirmado=1`);
}
