import { exigirCentral } from "@/server/autorizacao";
import { api } from "@/server/http";
import { reconciliarOfsc } from "@/server/ofsc/cliente";

export const POST = api(async (ator) => {
  exigirCentral(ator, "Só a central reconcilia a integração OFSC.");
  return reconciliarOfsc();
});
