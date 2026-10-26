import { api } from "@/server/http";
import { listarZonas } from "@/server/servicos";

export const GET = api(async () => listarZonas());
