"use server";

import { redirect } from "next/navigation";
import { sair } from "@/server/sessao";

export async function sairAcao() {
  await sair();
  redirect("/entrar");
}
