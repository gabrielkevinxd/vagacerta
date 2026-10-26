"use server";

import { revalidatePath } from "next/cache";
import { eIdioma } from "@/lib/i18n";
import { gravarIdioma } from "@/server/idioma";
import { obterAtor } from "@/server/sessao";

export async function definirIdiomaAcao(dados: FormData) {
  const pedido = String(dados.get("idioma") ?? "");
  if (!eIdioma(pedido)) return;
  const ator = await obterAtor();
  await gravarIdioma(pedido, ator?.id ?? null);
  revalidatePath("/", "layout");
}
