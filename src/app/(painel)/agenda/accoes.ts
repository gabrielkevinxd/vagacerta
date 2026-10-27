"use server";

import { redirect } from "next/navigation";
import { ErroHttp } from "@/server/erros";
import { exigirAtorPagina } from "@/server/sessao";
import { reagendar } from "@/server/servicos";

export async function confirmarArrasto(formulario: FormData) {
  const ator = await exigirAtorPagina();
  const ordemId = String(formulario.get("ordem") ?? "");
  const equipaId = String(formulario.get("equipaId") ?? "");
  const dia = String(formulario.get("dia") ?? "");
  const inicio = String(formulario.get("inicio") ?? "");
  const vista = String(formulario.get("vista") ?? "dia");
  const ancora = String(formulario.get("data") ?? dia);
  const distrito = String(formulario.get("distrito") ?? "").trim();
  const municipio = String(formulario.get("municipio") ?? "").trim();
  const zona = [
    distrito ? `distrito=${encodeURIComponent(distrito)}` : "",
    municipio ? `municipio=${encodeURIComponent(municipio)}` : "",
  ]
    .filter(Boolean)
    .join("&");
  const voltar = `/agenda?vista=${encodeURIComponent(vista)}&data=${encodeURIComponent(ancora)}${zona ? `&${zona}` : ""}`;
  try {
    await reagendar(ator, ordemId, { equipaId, data: dia, inicioPlaneado: inicio });
  } catch (erro) {
    if (erro instanceof ErroHttp) redirect(`${voltar}&erro=${encodeURIComponent(erro.message)}`);
    throw erro;
  }
  redirect(`${voltar}&gravado=1`);
}
