import { api } from "@/server/http";
import { listarEquipas } from "@/server/servicos";

export const GET = api(async (ator) => listarEquipas(ator));
